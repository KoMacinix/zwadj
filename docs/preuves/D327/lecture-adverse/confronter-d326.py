"""D327 — lecture adverse de D326 (rang 33 : le PDF du devis, les boutons de remise, les réparations de l'app Pro), confrontée aux objets git à des SHA FIXÉS.

POURQUOI IL EXISTE
  Forme de Ko au rang 34 : « la lecture adverse depuis la clôture de D326, EN ENTIER, et EN ENTIER dans ton rapport final ; instrument versé ; objets git lus à des SHA fixés ; chaque extracteur calibré
  sur un cas vrai et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré ; aucune porte ni campagne rejouée », avec cinq questions
  appelant chacune une pièce (« Ma salle », le constat navigateur du stepper, la version active, les sept campagnes, l'extension 5).
  Le dernier commit est la clôture de D326 (`470e607`) ; aucun commit ne la suit. Chaque affirmation de D326 qui se vérifie dans le dépôt est confrontée à sa SOURCE : les pièces versées de SA passe, les objets
  git, le texte des fichiers d'autorité. Une affirmation qui ne vit que dans le chat est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D327/lecture-adverse/confronter-d326.py > docs/preuves/D327/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF : (1) la famille X (état LIVE : `git status`, `stash`, `fetch`, `rev-parse`, la bannière de
  `pdftotext`) ; (2) la famille Q, pour les PIÈCES DU RELEVÉ de ce lot (`docs/preuves/D327/releve/`, qui ne sont pas encore commitées — ce sont les pièces que les questions 1 et 3 exigent) et pour deux
  fichiers de D326 dont l'octet se compare à sa copie (captures « avant » contre « avant rejouées »).
  AUCUN rejeu de porte ni de campagne ici.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d325.py` (D326) — il juge D325 ; une lecture « à l'œil » — elle rate les chiffres et les sources (D320, écart 9 ; D322, écart C6). Les assistants (`ctl`, calibration à
  deux bras, textes aplatis) sont ceux de D326, RÉÉCRITS ici : aucun import, l'instrument de D326 reste une pièce.

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils ont
  PARCOURU et leur attendu à côté (D290), et le total des contrôles avec sa ventilation par famille (D295). Un attendu est DÉRIVÉ d'une pièce brute — jamais écrit de mémoire (D275) ; les chiffres que D326
  ÉCRIT sont extraits de son TEXTE aplati, puis confrontés à la pièce.
"""
import hashlib
import json
import os
import re
import struct
import subprocess
import sys
import zlib

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

FIN = "470e607"      # clôture de D326
CODE = "a9840bd"     # le commit de code du rang 33 (partie B)
PREUVE = "8524658"   # la preuve de l'arabe
OUV = "2cb6915"      # l'ouverture (partie A, documentaire)
DEBUT = "12593c1"    # SHA de départ de D326
PD = "docs/preuves/D326"
AUTORITES = ("AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md")
ANSI = re.compile(r"\x1b\[[0-9;]*m")
ESP = re.compile(r"[\s  ]+")

controles, ecarts, constats, ecarts_live, non_verifiables = [], [], [], [], []
familles: dict = {}


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show_octets(sha, chemin):
    return git("show", f"{sha}:{chemin}")


def show(sha, chemin):
    return show_octets(sha, chemin).decode("utf-8", errors="replace").replace("\r\n", "\n")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def piece(nom, sha=FIN):
    return ANSI.sub("", show(sha, f"{PD}/{nom}"))


def vivant(chemin):
    """Un fichier de l'arbre de travail (famille Q seulement) : octets lus tels quels."""
    with open(chemin, "rb") as f:
        return f.read()


def aplati(t):
    return re.sub(r"\s+", " ", t)


def entier(s):
    return int(ESP.sub("", s))


def noms_diff(a, b, statut=False):
    sortie = git("diff", "--name-status" if statut else "--name-only", a, b).decode("utf-8").split("\n")
    return [l for l in sortie if l.strip()]


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_live if ident[0] == "X" else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:6} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:6} CONSTAT : {texte}")


def non_verifiable(ident, texte):
    non_verifiables.append(ident)
    print(f"? {ident:6} NON VÉRIFIABLE : {texte}")


# ── Extracteurs (chacun calibré plus bas) ────────────────────────────────────────────────────────────────────────────
def liste_constante_ts(texte, nom):
    """Les membres `Xxx.YYY` d'une `export const NOM = [ … ] as const;` TypeScript → ['YYY', …] ; None si la constante est absente."""
    m = re.search(r"export const " + re.escape(nom) + r"\s*=\s*\[([^\]]*)\]\s*as const", texte)
    if not m:
        return None
    return re.findall(r"\b\w+\.(\w+)\b", m[1])


def tableau_campagnes(texte):
    """{nom de campagne: (sortie, déclarées|None, mordues, muettes, non mesurées, secondes)} d'après le tableau final du lanceur (« neutralize-x.py  0  4  4  0  0  110 »)."""
    res = {}
    for m in re.finditer(r"^neutralize-([\w-]+)\.py\s+(\d+)\s+(\d+|—)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$", texte, flags=re.M):
        res[m[1]] = (int(m[2]), None if m[3] == "—" else int(m[3]), int(m[4]), int(m[5]), int(m[6]), int(m[7]))
    return res


def ligne_tests_rouge(texte):
    """(échoués, passés|None, total) de la ligne « code de sortie N · ligne « Tests » : A failed | B passed (T) » (ou « A failed (T) »)."""
    m = re.search(r"ligne « Tests » : (\d+) failed(?: \| (\d+) passed)? \((\d+)\)", texte)
    if not m:
        return None
    return (int(m[1]), None if m[2] is None else int(m[2]), int(m[3]))


def sans_lecture_assertion(texte):
    m = re.search(r"échecs lus : (\d+) \(AssertionError : (\d+) · autre : (\d+)\)", texte)
    return None if not m else (int(m[1]), int(m[2]), int(m[3]))


def cibles_decouverte(texte):
    """Les identifiants des lignes « ■ X-n. … » d'une pièce de découverte (une par cible JOUÉE)."""
    return re.findall(r"^■ ([A-Z]+-\d+)\.", ANSI.sub("", texte), flags=re.M)


def en_tete_cibles(texte):
    """(déclarées, jouées) de « cibles : 102 déclarées · 93 jouées (unit) · … »."""
    m = re.search(r"cibles : (\d+) déclarées · (\d+) jouées", ANSI.sub("", texte))
    return None if not m else (int(m[1]), int(m[2]))


def tableau_attendu(texte):
    m = re.search(r"#### Fichiers attendus.*?\n(.*?)\n⚠ Toute extension", texte, flags=re.S)
    return [] if not m else re.findall(r"^\| `([^`]+)`", m[1], flags=re.M)


def lignes_table(texte):
    """[[jetons de la PREMIÈRE cellule] par ligne] de la table « Fichiers attendus » : tous les jetons entre accents graves de la cellule (le premier est un chemin complet ; les suivants, ceux d'une PAIRE, complets ou nus)."""
    m = re.search(r"#### Fichiers attendus.*?\n(.*?)\n⚠ Toute extension", texte, flags=re.S)
    if not m:
        return []
    return [re.findall(r"`([^`]+)`", l.split("|")[1]) for l in m[1].split("\n") if l.startswith("| `")]


def jeton_chemin(j):
    return bool(re.fullmatch(r"[\w@./-]+\.(?:ts|tsx|json|py|md|css|yaml|mjs|txt)", j))


def extensions(texte):
    m = re.search(r"#### Extensions de la table.*?\n(.*?)\n#### Modes de défaillance", texte, flags=re.S)
    if not m:
        return {}
    res, courant = {}, None
    for ligne in m[1].split("\n"):
        d = re.match(r"^(\d+)\. ", ligne)
        if d:
            courant = int(d[1])
            res[courant] = []
        if courant is not None:
            res[courant] += [j for j in re.findall(r"`([^`]+)`", ligne) if jeton_chemin(j)]
    return res


def png_dims(octets):
    if len(octets) < 24 or octets[:8] != b"\x89PNG\r\n\x1a\n" or octets[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", octets[16:24])


def png_fabrique(w, h):
    brut = b"".join(b"\x00" + b"\x00\x00\x00" * w for _ in range(h))

    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(brut)) + chunk(b"IEND", b"")


def sceau_valide(octets):
    if not octets.endswith(b"\n"):
        return False
    corps, sep, derniere = octets[:-1].rpartition(b"\n")
    if not sep:
        return False
    m = re.fullmatch(
        r"== SCEAU sha256:([0-9a-f]{64}) — neutralisation/audit-secrets\.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==",
        derniere.decode("utf-8", errors="replace"),
    )
    return bool(m) and hashlib.sha256(corps + b"\n").hexdigest() == m.group(1)


def cles_json(obj, prefixe=""):
    if isinstance(obj, dict):
        out = []
        for k, v in obj.items():
            out += cles_json(v, f"{prefixe}.{k}" if prefixe else k)
        return out
    return [prefixe]


def melange_fins_de_ligne(octets):
    crlf = octets.count(b"\r\n")
    return crlf, octets.count(b"\n") - crlf


def ecrit_accepte(ligne):
    """Vrai si la ligne ÉCRIT un statut ACCEPTED (`nouveauStatut: QuoteStatus.ACCEPTED` ou `status: "ACCEPTED"`) ; une COMPARAISON (`=== QuoteStatus.ACCEPTED`) n'écrit rien."""
    return re.search(r"(?:nouveauStatut|status)\s*:\s*(?:QuoteStatus\.ACCEPTED|\"ACCEPTED\")", ligne) is not None


def declarations_de_tests(texte):
    """Le nombre de déclarations `it(` / `test(` en début de ligne (indentation permise) — un COMPTE DE DÉCLARATIONS, pas le nombre de tests exécutés (`it.each`, boucles)."""
    return len(re.findall(r"^\s*(?:it|test)(?:\.(?:skip|only))?\(", texte, flags=re.M))


def statut_http(texte, etiquette):
    """(code HTTP, 'code' du corps ou None) de la ligne « MESURE statut <étiquette> … → HTTP N · … » du relevé n° 1."""
    m = re.search(r"^MESURE statut " + re.escape(etiquette) + r" .*?→ HTTP (\d+)(?: · .*?\"code\":\"(\w+)\")?", texte, flags=re.M)
    return None if not m else (int(m[1]), m[2])


def listes_ma_salle(texte, scenario):
    """{libellé: liste des noms} des lectures « SANS rechargement » / « APRÈS rechargement » d'un scénario S<n> du relevé « Ma salle »."""
    res = {}
    for m in re.finditer(r"^MESURE " + scenario + r" · (.*)$", texte, flags=re.M):
        ligne = m[1]
        for lib in ("SANS rechargement", "APRÈS rechargement"):
            mm = re.search(lib + r"(?: [^:\[]*)? : (\[.*?\])(?: · |$)", ligne)
            if mm:
                try:
                    res[lib] = json.loads(mm[1])
                except json.JSONDecodeError:
                    res[lib] = mm[1]
    return res


# ══ CALIBRATION — deux bras par extracteur ; abandon si un seul manque ═════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("liste d'une constante positif", liste_constante_ts("export const QUOTE_OPEN_STATUSES = [QuoteStatus.DRAFT, QuoteStatus.SENT] as const;", "QUOTE_OPEN_STATUSES"), ["DRAFT", "SENT"])
bras("liste d'une constante négatif (constante absente)", liste_constante_ts("export const AUTRE = [QuoteStatus.DRAFT] as const;", "QUOTE_OPEN_STATUSES"), None)
tab = "neutralize-r30.py                       0     8     8     0     0    60\nneutralize-journey.py                   0     —     7     0     0   311\n"
bras("tableau de campagnes positif (une ligne à « — »)", tableau_campagnes(tab), {"r30": (0, 8, 8, 0, 0, 60), "journey": (0, None, 7, 0, 0, 311)})
bras("tableau de campagnes négatif (aucun tableau)", tableau_campagnes("rien\n"), {})
bras("ligne « Tests » d'un rouge positif", ligne_tests_rouge("# code de sortie 1 · ligne « Tests » : 2 failed | 1 passed (3)"), (2, 1, 3))
bras("ligne « Tests » d'un rouge, forme sans « passed »", ligne_tests_rouge("# code de sortie 1 · ligne « Tests » : 5 failed (5)"), (5, None, 5))
bras("ligne « Tests » négatif (absente)", ligne_tests_rouge("rien"), None)
bras("échecs lus positif", sans_lecture_assertion("# échecs lus : 17 (AssertionError : 7 · autre : 10) — x"), (17, 7, 10))
bras("échecs lus négatif", sans_lecture_assertion("rien"), None)
bras("cibles de découverte positif", cibles_decouverte("■ F-1. un libellé\n   détail\n■ M-2. autre\n"), ["F-1", "M-2"])
bras("cibles de découverte négatif (une ligne indentée, un ✓)", cibles_decouverte("   ■ F-1. indentée\n✓ M-2. mordue\n"), [])
bras("en-tête de cibles positif", en_tete_cibles("cibles : 102 déclarées · 93 jouées (unit) · 9 non jouée(s)"), (102, 93))
bras("en-tête de cibles négatif", en_tete_cibles("rien"), None)
bras("tableau attendu positif", tableau_attendu("#### Fichiers attendus — x\n\n| fichier | pour |\n|---|---|\n| `a/b.ts` | x |\n| `ZW.md` | y |\n\n⚠ Toute extension"), ["a/b.ts", "ZW.md"])
bras("tableau attendu négatif (pas de table)", tableau_attendu("rien"), [])
bras("lignes de table positif (une paire : second membre nu ; une paire : second membre complet)", lignes_table("#### Fichiers attendus — x\n\n| fichier | pour |\n|---|---|\n| `a/b.ts` *(neuf)* + `c.ts` *(neuf)* | x |\n| `d/e.ts` + `d/f.ts` | y |\n\n⚠ Toute extension"), [["a/b.ts", "c.ts"], ["d/e.ts", "d/f.ts"]])
bras("lignes de table négatif (pas de table)", lignes_table("rien"), [])
bras("extensions positif", extensions("#### Extensions de la table — x\n\n1. **`a/b.ts` et `Record<X, Y>`** — m\n2. `c/d.json` seul\n\n#### Modes de défaillance"), {1: ["a/b.ts"], 2: ["c/d.json"]})
bras("extensions négatif", extensions("rien"), {})
bras("png positif (24×7)", png_dims(png_fabrique(24, 7)), (24, 7))
bras("png négatif (pas un PNG)", png_dims(b"GIF89a" + b"\x00" * 30), None)
corps_ok = b"corps\n"
sc_ok = corps_ok + ("== SCEAU sha256:{} — neutralisation/audit-secrets.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==\n").format(hashlib.sha256(corps_ok).hexdigest()).encode("utf-8")
bras("sceau positif", sceau_valide(sc_ok), True)
bras("sceau négatif (un octet changé)", sceau_valide(sc_ok.replace(b"corps", b"corpS")), False)
bras("clés JSON positif", sorted(cles_json({"a": {"b": "x", "c": {"d": "y"}}, "e": "z"})), ["a.b", "a.c.d", "e"])
bras("clés JSON négatif (un JSON vide)", cles_json({}), [])
bras("fins de ligne : CRLF pur", melange_fins_de_ligne(b"a\r\nb\r\n"), (2, 0))
bras("fins de ligne : un LF nu repéré", melange_fins_de_ligne(b"a\r\nb\n"), (1, 1))
bras("écriture de ACCEPTED positif (une écriture)", ecrit_accepte("      nouveauStatut: QuoteStatus.ACCEPTED,"), True)
bras("écriture de ACCEPTED négatif (une comparaison n'écrit rien)", ecrit_accepte("  return isQuoteOpen(status) || status === QuoteStatus.ACCEPTED;"), False)
bras("déclarations de tests positif (it, test, indentés)", declarations_de_tests("  it(\"a\", () => {});\ntest('b', () => {});\n    it.skip(\"c\", x);\n"), 3)
bras("déclarations de tests négatif (un appel qui n'en est pas une)", declarations_de_tests("const x = wait(\"a\");\n// it(\"b\")\n"), 0)
mes = "MESURE statut ACCEPTED (lu en base : ACCEPTED ; posé par SQL) → HTTP 200 · application/pdf · 16987 octets\nMESURE statut CANCELLED (lu) → HTTP 409 · {\"statusCode\":409,\"message\":{\"code\":\"QUOTE_STATUS_CONFLICT\",\"status\":\"CANCELLED\"}}\n"
bras("statut HTTP positif (un 200)", statut_http(mes, "ACCEPTED"), (200, None))
bras("statut HTTP positif (un 409 et son code)", statut_http(mes, "CANCELLED"), (409, "QUOTE_STATUS_CONFLICT"))
bras("statut HTTP négatif (étiquette absente)", statut_http(mes, "SENT"), None)
mm = 'MESURE S4 · avant : ["A"] · après l\'édition (PATCH 200), SANS rechargement : ["A"]\nMESURE S4 · APRÈS rechargement : ["B"]\n'
bras("listes « Ma salle » positif", listes_ma_salle(mm, "S4"), {"SANS rechargement": ["A"], "APRÈS rechargement": ["B"]})
bras("listes « Ma salle » négatif (scénario absent)", listes_ma_salle(mm, "S9"), {})
if not all(cal):
    sys.exit(f"CALIBRATION : {cal.count(False)} bras manqué(s) — l'instrument ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

# ══ Les textes lus, une fois ══════════════════════════════════════════════════════════════════════════════════════════
CONT_FIN = show(FIN, "ZWADJ_CONTINUITE.md")
CONT_OUV = show(OUV, "ZWADJ_CONTINUITE.md")
CONT_CODE = show(CODE, "ZWADJ_CONTINUITE.md")
AGENTS_FIN = show(FIN, "AGENTS.md")
BACKLOG_FIN = show(FIN, "ZWADJ_BACKLOG.md")
BLOC = re.search(r"### ⛔ CLÔTURE DU 08/10/2026 \(D326\).*?(?=### ⛔ L'ÉTAT DU RANG, À LIRE EN PREMIER — écrit à l'ouverture \(D326\))", CONT_FIN, flags=re.S)
SEC = re.search(r"## Session du 05/10/2026 — D326 .*?(?=\n## Session du 04/10/2026 — D325)", CONT_FIN, flags=re.S)
if not BLOC or not SEC:
    sys.exit("le bloc de clôture ou la section de D326 est introuvable : l'instrument ne juge pas")
CLOT = aplati(BLOC[0])
SECT = aplati(SEC[0])
print(f"== texte lu à {FIN} : bloc de clôture {len(CLOT)} caractères · section D326 {len(SECT)} caractères (aplatis)\n")

# ══ P — provenance et diff ════════════════════════════════════════════════════════════════════════════════════════════
print("== P — provenance : les commits de D326 et ce que chacun touche")
rev = lambda sha: git("rev-parse", sha).decode().strip()
parents = lambda sha: git("rev-list", "--parents", "-n", "1", sha).decode().split()[1:]
ctl("P1a", "parent de la clôture = le commit de code", [rev(CODE)], parents(FIN))
ctl("P1b", "parent du commit de code = la preuve de l'arabe", [rev(PREUVE)], parents(CODE))
ctl("P1c", "parent de la preuve de l'arabe = l'ouverture", [rev(OUV)], parents(PREUVE))
ctl("P1d", "parent de l'ouverture = le SHA de départ", [rev(DEBUT)], parents(OUV))
ctl("P2", "commits de D326 (DEBUT..FIN)", 4, len(git("rev-list", f"{DEBUT}..{FIN}").decode().split()))
hors_pr = lambda a, b: [n for n in noms_diff(a, b) if not n.startswith("docs/preuves/")]
ctl("P3", "la clôture touche, hors docs/preuves, les trois .md d'autorité et rien d'autre", sorted(AUTORITES), sorted(hors_pr(CODE, FIN)))
ctl("P4", "l'ouverture touche, hors docs/preuves, les trois .md d'autorité et rien d'autre", sorted(AUTORITES), sorted(hors_pr(DEBUT, OUV)))
ctl("P5", "la preuve de l'arabe ne touche, hors docs/preuves, que ZWADJ_BACKLOG.md et ZWADJ_CONTINUITE.md (aucun fichier de code)", ["ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md"], sorted(hors_pr(OUV, PREUVE)))

# La table et ses extensions.
tables = tableau_attendu(CONT_FIN)
exts = extensions(CONT_FIN)
print(f"   (table lue à {FIN} : {len(tables)} lignes ; extensions lues : {sorted(exts)} — {sum(len(v) for v in exts.values())} jetons chemin)")
ctl("P6a", "la table compte des lignes (l'extracteur a parcouru quelque chose)", True, len(tables) > 30)
ctl("P6b", "cinq extensions lues, numérotées 1 à 5", [1, 2, 3, 4, 5], sorted(exts))
diff_code = [n for n in noms_diff(DEBUT, FIN) if not n.startswith(f"{PD}/")]
txt = re.search(r"\*\*(\d+) fichiers\*\*, dont \*\*(\d+)\*\* dans la table, \*\*(\d+)\*\* par extension \(1, 3 et 4\) et \*\*(\d+)\*\* seconds membres", SEC[0].replace("\n", " "))
ctl("P6c", "le texte de D326 écrit « 64 fichiers dont 54 dans la table, 3 par extension (1, 3 et 4), 7 seconds membres » (la phrase est trouvée)", True, txt is not None)
bases = {}
for n in git("ls-tree", "-r", "--name-only", FIN).decode().split("\n"):
    if n:
        bases.setdefault(n.rsplit("/", 1)[-1], []).append(n)
dossiers_table = {t.rsplit("/", 1)[0] for t in tables if "/" in t}


def dans_table(f):
    return any(f == t or (t.endswith("/") and f.startswith(t)) for t in tables)


rows = lignes_table(CONT_FIN)
table_complets = [j for r in rows for j in r if "/" in j]
bares = [(r[0], j) for r in rows for j in r[1:] if "/" not in j and jeton_chemin(j)]
bares_resolus = [r0.rsplit("/", 1)[0] + "/" + j for r0, j in bares]
print(f"   (lignes de la table : {len(rows)} ; jetons à chemin complet : {len(table_complets)} ; seconds membres NUS : {len(bares)} → {bares_resolus})")
ctl("P6j", "l'extension 5 liste exactement les seconds membres que la table écrit sans leur dossier (les noms de base concordent, parcouru : 7 jetons)", sorted(j.rsplit("/", 1)[-1] for j in bares_resolus), sorted(j.rsplit("/", 1)[-1] for j in exts.get(5, [])))
fichiers_table = {f for f in diff_code if dans_table(f) or f in table_complets}
n_table = len(fichiers_table)
par_ext = []
for k in (1, 2, 3, 4):
    for j in exts.get(k, []):
        par_ext += [f for f in diff_code if f == j or f.endswith("/" + j)]
n_ext = len({f for f in par_ext if f not in fichiers_table and f not in bares_resolus})
n_sec = len({f for f in bares_resolus if f in diff_code and f not in fichiers_table})
non_declares = [f for f in diff_code if f not in fichiers_table and f not in par_ext and f not in bares_resolus]
if txt:
    ctl("P6d", "fichiers hors docs/preuves/D326 du diff DEBUT..FIN = « 64 »", int(txt[1]), len(diff_code))
    ctl("P6e", "dont dans la table (tous les chemins complets de la première cellule ; répertoires par préfixe) = « 54 »", int(txt[2]), n_table)
    ctl("P6f", "dont par extension (1, 3, 4) seulement = « 3 »", int(txt[3]), n_ext)
    ctl("P6g", "dont seconds membres de paire écrits SANS dossier (extension 5) = « 7 »", int(txt[4]), n_sec)
ctl("P6h", "fichiers du diff NON DÉCLARÉS (ni table, ni extension, ni second membre) — « 0 non déclaré »", [], non_declares)
ctl("P6i", "classement exhaustif : table + extension + seconds membres = tout le diff hors preuves", len(diff_code), n_table + n_ext + n_sec)
ven = [f for f in diff_code if f.startswith("apps/api/src/venues/")]
ctl("P7a", "seul fichier de apps/api/src/venues/ touché : quotes.controller.ts (le texte d'une description de route)", ["apps/api/src/venues/quotes.controller.ts"], ven)
num = git("diff", "--numstat", DEBUT, FIN, "--", "apps/api/src/venues/quotes.controller.ts").decode().split()
ctl("P7b", "quotes.controller.ts : « trois lignes de chaîne » = 2 ajoutées + 1 retirée", (2, 1), (int(num[0]), int(num[1])))
ctl("P7c", "aucune migration touchée (apps/api/prisma/migrations)", [], [f for f in noms_diff(DEBUT, FIN) if f.startswith("apps/api/prisma/migrations")])
# apps/api/package.json : « playwright-core 1.50.1 » est la dépendance annoncée ; le diff porte AUSSI la réécriture d'une ligne de script.
num_pkg = git("diff", "--numstat", DEBUT, FIN, "--", "apps/api/package.json").decode().split()
diff_pkg = git("diff", DEBUT, FIN, "--", "apps/api/package.json").decode("utf-8", errors="replace")
plus = [l[1:] for l in diff_pkg.split("\n") if l.startswith("+") and not l.startswith("+++")]
moins = [l[1:] for l in diff_pkg.split("\n") if l.startswith("-") and not l.startswith("---")]
ctl("P8a", "apps/api/package.json : l'annonce est UNE dépendance (1 ajoutée, 0 retirée) — le diff compte 2 ajoutées et 1 retirée", (1, 0), (int(num_pkg[0]), int(num_pkg[1])))
ligne_reecrite = [l for l in plus if "prisma:migrate:dev" in l]
ctl("P8b", "la ligne en plus du diff est la réécriture de `prisma:migrate:dev` (la ligne retirée aussi)", (1, 1), (len(ligne_reecrite), len([l for l in moins if "prisma:migrate:dev" in l])))
ancien = json.loads(show(DEBUT, "apps/api/package.json"))["scripts"]["prisma:migrate:dev"]
nouveau = json.loads(show(FIN, "apps/api/package.json"))["scripts"]["prisma:migrate:dev"]
ctl("P8c", "…et cette réécriture est ÉQUIVALENTE (la chaîne analysée est identique : `\\u2014` devenu « — » dans le texte du JSON)", True, ancien == nouveau)
ctl("P8d", "pnpm-lock.yaml : 7 lignes ajoutées, 0 retirée (playwright-core et le lien de workspace)", (7, 0), tuple(int(x) for x in git("diff", "--numstat", DEBUT, FIN, "--", "pnpm-lock.yaml").decode().split()[:2]))
ctl("P8e", "playwright-core de l'API = @playwright/test de l'e2e (même version, relevée)", True, json.loads(show(FIN, "apps/api/package.json"))["dependencies"]["playwright-core"] == json.loads(show(FIN, "e2e/package.json"))["devDependencies"]["@playwright/test"])
# ⚠ LES OBJETS GIT SONT NORMALISÉS EN LF (`core.autocrlf=true` sur ce poste) : lire les fins de ligne dans `git show` est AVEUGLE (soixante fichiers « LF pur » — mesuré). Elles se lisent dans l'ARBRE DE TRAVAIL, qui est celui de la
# clôture (X1, X3 : HEAD = FIN, aucun fichier suivi modifié) — la seule lecture que D326 ait pu faire.
objets_crlf = [f for f in diff_code if existe(FIN, f) and not re.search(r"\.(png|woff2)$", f) and melange_fins_de_ligne(show_octets(FIN, f))[0] > 0]
ctl("P9a", "contrôle de l'instrument : les OBJETS git ne portent aucun CRLF (core.autocrlf=true les normalise) — une lecture des fins de ligne dans les objets serait aveugle", [], objets_crlf)
fins = {}
for f in diff_code:
    if re.search(r"\.(png|woff2)$", f) or not os.path.isfile(f):
        continue
    fins[f] = melange_fins_de_ligne(vivant(f))
melanges = sorted(f for f, (c, n) in fins.items() if c > 0 and n > 0)
ctl("P9b", "ARBRE DE TRAVAIL : aucun des fichiers de code du lot ne mêle CRLF et LF nu (octets, hors images et polices)", [], melanges)
lf_pur = sorted(f for f, (c, n) in fins.items() if c == 0 and n > 0)
print(f"   (fins de ligne parcourues dans l'arbre : {len(fins)} fichiers · LF pur : {lf_pur})")
ctl("P9c", "D326 : « fins de ligne relevées en octets sur les 60 fichiers de code (hors images et polices) » — 60 fichiers parcourus ; ⚠ ils incluent les TROIS .md d'autorité (« de code » est un raccourci : 57 fichiers de code + 3 .md)", (60, 57), (len(fins), len([f for f in fins if f not in AUTORITES])))
ctl("P9d", "D326 : « trois restent en LF pur » (apps/api/package.json, pnpm-lock.yaml, la licence de la police)", ["apps/api/package.json", "apps/api/src/documents/fonts/OFL-readex-pro.txt", "pnpm-lock.yaml"], [f for f in lf_pur if f not in AUTORITES])
print()

# ══ G — portes : ce que D326 écrit, et la pièce qui le porte ═══════════════════════════════════════════════════════════
print("== G — les portes : les chiffres de D326 contre ce que le dépôt peut en dire")
tous_pieces = [f for f in git("ls-tree", "-r", "--name-only", FIN, PD).decode().split("\n") if f]
porteurs = [f for f in tous_pieces if f.endswith(".txt") and re.search(r"^\s*(?:\[[^\]]+\]\s+)?(?:Test Files|Tests)\s+\d+ passed", ANSI.sub("", show(FIN, f)), flags=re.M)]
ctl("G1", "pièces versées de D326 qui portent un RÉSUMÉ VITEST des portes (« Test Files N passed » / « Tests N passed ») — la règle de D291 exige une pièce brute pour une mesure écrite", True, len(porteurs) >= 1)
print(f"   (pièces de D326 parcourues : {len(tous_pieces)} ; avec un résumé vitest : {porteurs})")
nums = re.search(r"API \*\*(\d+)/(\d+)\*\* \(\+(\d+)/\+(\d+)\), api-client \*\*(\d+)/(\d+)\*\* \(\+(\d+)/\+(\d+)\), client \*\*(\d+)/(\d+)\*\* \((\d+)\), pro \*\*(\d+)/(\d+)\*\* \(\+(\d+)/\+(\d+)\)", BLOC[0].replace("\n", " "))
if nums:
    n = [int(x) for x in nums.groups()]
    ecrit = {"api": (n[0], n[2]), "api-client": (n[4], n[6]), "client": (n[8], n[10]), "pro": (n[11], n[13])}
else:
    ecrit = {}
ctl("G2a", "les chiffres des quatre paquets sont lisibles dans le bloc de clôture (API, api-client, client, pro)", 4, len(ecrit))
base = re.search(r"\(729/60 · 39/4 · 372/29 · 457/34 ; 444/36\)", CLOT)
ctl("G2b", "la base d'entrée est celle de la clôture de D325 (729/60 · 39/4 · 372/29 · 457/34 ; 444/36) — la phrase est trouvée", True, base is not None)
portees = {
    "api": lambda f: f.startswith("apps/api/src/") and f.endswith(".spec.ts"),
    "api-client": lambda f: f.startswith("packages/api-client/src/") and re.search(r"\.test\.tsx?$", f) is not None,
    "client": lambda f: f.startswith("apps/client/") and re.search(r"\.test\.tsx?$", f) is not None and "node_modules" not in f,
    "pro": lambda f: f.startswith("apps/pro/src/") and re.search(r"\.test\.tsx?$", f) is not None,
    "int": lambda f: f.startswith("apps/api/test/int/") and f.endswith(".int-spec.ts"),
}


def total_decl(sha, pred):
    return sum(declarations_de_tests(show(sha, f)) for f in git("ls-tree", "-r", "--name-only", sha).decode().split("\n") if f and pred(f))


ent = re.search(r"`test:int` \*\*0\*\*, \*\*(\d+)/(\d+)\*\* \(\+(\d+)/\+(\d+)\)", BLOC[0].replace("\n", " "))
if ent:
    ecrit["int"] = (int(ent[1]), int(ent[3]))
ctl("G3a", "le bloc de clôture écrit un écart pour CINQ portées (API, api-client, client, pro, intégration)", 5, len(ecrit))
for k, pred in portees.items():
    a, b = total_decl(DEBUT, pred), total_decl(FIN, pred)
    ctl(f"G3-{k}", f"l'écart de tests ÉCRIT dans D326 pour « {k} » est retrouvé par COMPTAGE des déclarations `it(`/`test(` entre DEBUT et FIN (déclarations {a} → {b})", ecrit.get(k, (None, None))[1], b - a)
print("   (⚠ ce comptage ne dit pas qu'un test PASSE : il dit que le NOMBRE écrit est cohérent avec ce que le diff ajoute ; `it.each` et les boucles sont comptés une fois)")
non_verifiable("G4", "que `typecheck`, `lint`, `test`, `build`, `test:int` aient rendu 0 aux durées écrites (15, 12, 82, 34, 303 s), et que l'e2e ait rendu « 48 passés, 1 ignoré, 0 échec » trois fois : AUCUNE pièce brute n'est versée pour les portes de D326 (G1) ; seule la COHÉRENCE des écarts de tests avec le diff est établie (G3)")
print()

# ══ C — campagnes ═════════════════════════════════════════════════════════════════════════════════════════════════════
print("== C — les campagnes : ce que D326 écrit contre les journaux du lanceur et du harnais")
journal = piece("neutralisation/lancer-campagnes.txt")
camp = tableau_campagnes(journal)
print(f"   (tableau du lanceur : {len(camp)} lignes parcourues : {sorted(camp)})")
ctl("C1a", "le lanceur a joué SEPT campagnes (lignes du tableau final)", 7, len(camp))
ctl("C1b", "noms des sept campagnes lues dans le journal", ["act-plafonds", "horloge", "journey", "r30", "r32", "r33", "s9"], sorted(camp))
ecrits = {}
for nom in ("act-plafonds", "horloge", "journey", "r30", "r32", "r33", "s9"):
    m = re.search(r"`" + re.escape(nom) + r"` (\d+)/(\d+)", CLOT)
    if m:
        ecrits[nom] = (int(m[1]), int(m[2]))
ctl("C1c", "le bloc de clôture écrit un compte « N/N » pour CHACUNE des sept", 7, len(ecrits))
ctl("C1d", "chaque compte écrit (« 4/4 », « 2/2 », « 7/7 », « 8/8 », « 65/65 », « 93/93 », « 6/6 ») = mordues/jouées du journal (mordues = mordues + muettes + non mesurées)", ecrits, {k: (v[2], v[2] + v[3] + v[4]) for k, v in camp.items()})
ctl("C1e", "aucune muette ni non mesurée dans les sept (journal)", 0, sum(v[3] + v[4] for v in camp.values()))
ctl("C1f", "code de sortie 0 des sept", [0] * 7, [v[0] for v in sorted(camp.values(), key=lambda v: 0)])
tot = re.search(r"MESURÉ : (\d+) garde\(s\) mordue\(s\) · (\d+) muette\(s\)/erreur\(s\) · (\d+) non mesurée\(s\) · (\d+) campagne\(s\) · (\d+)s", journal)
ctl("C1g", "ligne de total du journal : 185 mordues · 0 · 0 · 7 campagnes · 2057 s", (185, 0, 0, 7, 2057), tuple(int(x) for x in tot.groups()) if tot else None)
ctl("C1h", "la somme des mordues du tableau = le total imprimé (parcouru : 7 lignes)", int(tot[1]) if tot else None, sum(v[2] for v in camp.values()))
ctl("C1i", "« 185 mordues » est écrit dans le bloc de clôture (la phrase est trouvée)", True, "185 mordues" in CLOT)
ctl("C1j", "journey et r32 font partie des sept", (True, True), ("journey" in camp, "r32" in camp))
ctl("C1k", "le journal annonce « 7 campagne(s) concernée(s) sur 34 »", True, "7 campagne(s) concernée(s) sur 34" in journal)
final = piece("neutralisation/campagne-r33-finale.txt")
ctl("C2a", "campagne finale r33 : « 102 déclarées · 102 jouées »", (102, 102), en_tete_cibles(final))
ctl("C2b", "campagne finale r33 : 102 lignes « ✓ » (une par cible mordue), parcouru", 102, len(re.findall(r"^✓ [A-Z]+-\d+\.", final, flags=re.M)))
ctl("C2c", "campagne finale r33 : « 19 fichier(s) muté(s) » et « 0 différent(s) » à la restauration", True, "19 fichier(s) muté(s)" in final and "19 fichier(s) ciblé(s) comparé(s) au départ · 0 différent(s)" in final)
ctl("C2d", "le texte de D326 écrit « 102 gardes mordues sur 102 cibles » et « 19 fichiers mutés, restauration 19/19 »", True, "102 gardes mordues sur 102" in CLOT and "19 fichiers mutés, restauration 19/19" in CLOT)
script = show(CODE, "neutralisation/neutralize-r33.py")
ctl("C3", "le harnais neutralize-r33.py déclare 102 cibles (appels `cible(` en début de ligne, au commit de code)", 102, len(re.findall(r"^cible\(", script, flags=re.M)))
dec = {k: piece(f"neutralisation/decouverte/{k}") for k in ("1-unit-avant-corrections.txt", "2-unit-apres-corrections-14-cibles.txt", "3-int-avant-corrections.txt", "4-int-apres-corrections.txt")}
u1, i3 = set(cibles_decouverte(dec["1-unit-avant-corrections.txt"])), set(cibles_decouverte(dec["3-int-avant-corrections.txt"]))
ctl("C4a", "découverte : « 93 cibles unitaires jouées » (pièce 1 : lignes « ■ »)", 93, len(u1))
ctl("C4b", "découverte : « puis 13 d'intégration » (pièce 3 : lignes « ■ »)", 13, len(i3))
ctl("C4c", "93 + 13 ne font pas 102 : l'union des deux pièces les fait — QUATRE cibles ont les deux mesures (93 + 13 − 4)", (4, 102), (len(u1 & i3), len(u1 | i3)))
ctl("C4d", "en-têtes de découverte : 102 déclarées dans chacune des quatre pièces", [102] * 4, [en_tete_cibles(dec[k])[0] for k in sorted(dec)])
ctl("C5", "pré-vol des neutralisations e2e : « 6 passed » dans la pièce versée", True, "6 passed" in piece("neutralisation-e2e/prevol-spec-verte.txt"))
non_verifiable("C6", "que la restauration des 19 fichiers ait eu lieu À L'OCTET pendant la campagne : la pièce porte « 0 différent(s) » (C2c), c'est le HARNAIS qui l'affirme, la lecture ne le rejoue pas")
print()

# ══ R — rouge lu ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== R — le rouge lu : les pièces de rouge/ contre les chiffres de D326")
attendus_rouge = {
    "pro-venue-wizard.txt": ("assistant 6/6", 6, 19),
    "pro-layout-style.txt": ("feuille 2/2", 2, 8),
    "api-client-auth-blob.txt": ("blob 2/2", 2, 17),
    "pro-walkin-journey.txt": ("remise 17 échecs", 17, 95),
    "api-client-quotes.txt": ("quotes.document 5 échecs", 5, 5),
}
for nom, (lib, echoues, total) in attendus_rouge.items():
    t = piece(f"rouge/{nom}")
    r = ligne_tests_rouge(t)
    ctl(f"R-{nom.split('.')[0]}", f"{lib} : échoués/total lus dans l'en-tête de la pièce", (echoues, total), None if r is None else (r[0], r[2]))
t = piece("rouge/pro-walkin-journey.txt")
ctl("R-wj-a", "parcours de remise : « 17 échecs (7 assertions, 10 requêtes) » = 7 AssertionError et 10 autres lus", (17, 7, 10), sans_lecture_assertion(t))
ma = piece("rouge/ma-salle-avant-correctif.txt")
ctl("R-ma", "« Ma salle » : rouge « 2 sur 3 » (2 en échec, 1 passé) — la ligne « Tests » de la pièce", True, "Tests  2 failed | 1 passed (3)" in ma)
ctl("R-ma-b", "« Ma salle » : le TROISIÈME test (la relecture n'a pas lieu quand la création échoue) PASSE avant le correctif — un test vert sans la réparation, il ne mesure pas la réparation", True, "la relecture ne se fait PAS quand la création ÉCHOUE" not in ma)
ctl("R-360", "« Pro à 360 px » : 2 sur 2 — la pièce porte des lignes ✓ de calibrage (ce n'est pas une sortie vitest du rouge)", True, "Tests" in piece("rouge/pro-360-avant-correctif.txt") or "✓" in piece("rouge/pro-360-avant-correctif.txt"))
print()

# ══ K — captures ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== K — captures : images lues à FIN")
lst = lambda d: sorted(f for f in tous_pieces if f.startswith(f"{PD}/navigateur/captures/{d}/") and f.endswith(".png"))
apres, avant, avant_rejoue = lst("apres"), lst("avant"), lst("avant-rejoue")
ctl("K1", "captures « après » : 21 images (12 de la remise + 8 de l'assistant + « Ma salle »)", 21, len(apres))
ctl("K2", "…dont 12 images de la remise", 12, len([f for f in apres if "/remise-" in f]))
ctl("K3", "…dont 8 images de l'assistant", 8, len([f for f in apres if "/assistant-" in f]))
mauvaises = [f for f in apres + avant + avant_rejoue if png_dims(show_octets(FIN, f)) is None]
ctl("K4", "toutes les images (apres, avant, avant-rejoue) sont des PNG valides (en-tête lu)", [], mauvaises)
ctl("K5", "9 images « avant » et 9 « avant rejouées »", (9, 9), (len(avant), len(avant_rejoue)))
ident = [f.rsplit("/", 1)[-1] for f in avant if hashlib.sha256(show_octets(FIN, f)).hexdigest() == hashlib.sha256(show_octets(FIN, f.replace("/avant/", "/avant-rejoue/"))).hexdigest()]
ctl("K6", "les 9 images « avant » (prises le 05/10) sont IDENTIQUES à l'octet à celles rejouées le 08/10 contre les sources de HEAD (le rejeu reproduit l'original)", 9, len(ident))
mr = piece("navigateur/captures/mesures-remise.txt")
exc = re.findall(r"excédent (\d+) px", mr)
ctl("K7", "débordement horizontal : « 0 px sur les douze mesures »", (12, True), (len(exc), all(e == "0" for e in exc)))
print()

# ══ T — texte d'autorité ═════════════════════════════════════════════════════════════════════════════════════════════
print("== T — registre, ordre des rangs, parité des catalogues, décisions")
reg_lignes = [l for l in CONT_FIN.split("\n") if re.match(r"^\| D\d+ \|", l)]
ctl("T1", "dernière ligne du registre à FIN = D326", "D326", re.match(r"^\| (D\d+) ", reg_lignes[-1])[1])
ordre = re.search(r"## ORDRE DES RANGS — QUEL lot vient ensuite.*?(?=\n## ~~PROCHAIN LOT~~)", CONT_FIN, flags=re.S)
rangs = re.findall(r"⇒ \*\*RANG (\d+) :", ordre[0]) if ordre else []
ctl("T2", "dernière ligne « ⇒ RANG N » de l'ordre des rangs à FIN = RANG 34 (« EN ATTENTE D'ARBITRAGE DE KO »)", "34", rangs[-1] if rangs else None)
fr_d, ar_d = json.loads(show(DEBUT, "packages/i18n/messages/fr.json")), json.loads(show(DEBUT, "packages/i18n/messages/ar.json"))
fr_f, ar_f = json.loads(show(FIN, "packages/i18n/messages/fr.json")), json.loads(show(FIN, "packages/i18n/messages/ar.json"))
kfd, kad, kff, kaf = (set(cles_json(x)) for x in (fr_d, ar_d, fr_f, ar_f))
ctl("T3a", "parité des catalogues à DEBUT : 1 129 = 1 129 (clés feuilles)", (1129, 1129), (len(kfd), len(kad)))
ctl("T3b", "parité des catalogues à FIN : 1 158 = 1 158 (clés feuilles)", (1158, 1158), (len(kff), len(kaf)))
ctl("T3c", "« +30 −1 par langue » (ajoutées, retirées) en français puis en arabe", ((30, 1), (30, 1)), ((len(kff - kfd), len(kfd - kff)), (len(kaf - kad), len(kad - kaf))))
ctl("T3d", "la clé retirée est venue.ui.walkin.clientNeeded (les deux langues)", ({"venue.ui.walkin.clientNeeded"}, {"venue.ui.walkin.clientNeeded"}), (kfd - kff, kad - kaf))
ctl("T3e", "`quote.validation.sentViaInvalid` est absente des DEUX catalogues (le texte la signale)", (False, False), ("quote.validation.sentViaInvalid" in kff, "quote.validation.sentViaInvalid" in kaf))
decisions_seules = re.search(r"### D326 — PARTIE B : ce que la session a décidé SEULE.*?(?=### D326 — PARTIE B : les limites)", SEC[0], flags=re.S)
numeros = re.findall(r"^(\d+)\. ", decisions_seules[0], flags=re.M) if decisions_seules else []
bloc_nums = sorted({int(x) for x in re.findall(r"\*\*\((\d+)\)\*\*", re.search(r"Décisions de la session À RATIFIER PAR KO.*?(?=\n⇒ \*\*À ORDONNER)", BLOC[0], flags=re.S)[0])})
ctl("T4", "décisions « à ratifier » : le bloc de clôture porte la MÊME numérotation que la section de la partie B (7 à 12) — la douzième (« playwright-core n'est pas dans e2e/package.json ») manque au bloc", [int(x) for x in numeros], bloc_nums)
ctl("T5", "AGENTS.md à FIN porte l'invariant du PDF (« LE PDF D'UN DEVIS IMPRIME LA VALEUR STOCKÉE »)", True, "LE PDF D'UN DEVIS IMPRIME LA VALEUR STOCKÉE" in AGENTS_FIN)
ctl("T6", "le backlog à FIN porte « Reports de la PARTIE B du rang 33 »", True, "Reports de la PARTIE B du rang 33" in BACKLOG_FIN)
print()

# ══ Q — les cinq questions de Ko ═════════════════════════════════════════════════════════════════════════════════════
print("== Q — les cinq questions de Ko, chacune avec sa pièce")

# Q1 — « Ma salle »
print("-- Q1 « MA SALLE » : quel test le couvrait, pourquoi est-il vert, et le défaut reproduit dans un navigateur")
src_test = show(CODE, "apps/pro/src/venues/create-venue-page.test.tsx")
titres = re.findall(r"^\s*it\(\"([^\"]+)\"", src_test, flags=re.M)
ctl("Q1a", "le test de D326 (create-venue-page.test.tsx) compte TROIS `it(`", 3, len(titres))
ctl("Q1b", "le double du serveur y fabrique la salle AVANT de répondre : `creees.push(NOUVELLE)` dans `create` (la liste lue ensuite la contient par construction)", 1, src_test.count("creees.push(NOUVELLE)"))
ctl("Q1c", "ce fichier ne simule NI édition NI suppression : aucun appel `update(`, `softDelete(` ni `PATCH` dans ses déclarations", 0, len(re.findall(r"\.(?:update|softDelete)\(|PATCH", src_test)))
tests_pro = [f for f in git("ls-tree", "-r", "--name-only", CODE, "apps/pro/src").decode().split("\n") if re.search(r"\.test\.tsx?$", f)]
lisent_liste = [f for f in tests_pro if re.search(r"listMine", show(CODE, f)) and re.search(r"venuesApi\.(update|softDelete)|venues\.(update|softDelete)", show(CODE, f))]
print(f"   (fichiers de test de l'app Pro parcourus : {len(tests_pro)} ; qui parlent de `listMine` ET d'une édition/suppression : {lisent_liste})")
ctl("Q1d", "aucun test de l'app Pro ne relie « la liste relue » à une ÉDITION ou une SUPPRESSION depuis l'assistant (jsdom ne les couvre pas)", [], [f for f in lisent_liste if "edit-venue" in f or "create-venue" in f])
ctl("Q1e", "D326 DISAIT la limite : « la liste « Ma salle » n'est relue qu'à la CRÉATION (une édition ou une publication ne la relit pas — lu dans le code, non reproduit dans un navigateur) »", True, "n'est relue qu'à la CRÉATION" in SECT and "non reproduit" in SECT)
src_edit = show(CODE, "apps/pro/src/venues/edit-venue-page.tsx")
ctl("Q1f", "l'assistant d'édition n'appelle jamais la relecture du fournisseur : `reload` / `useProVenues().reload` absents de edit-venue-page.tsx (il n'importe que `select`)", 0, len(re.findall(r"\breload(?:Venues)?\(", src_edit)))
src_create = show(CODE, "apps/pro/src/venues/create-venue-page.tsx")
ctl("Q1g", "seule la page de CRÉATION appelle la relecture (`reloadVenues()`), une fois, après `venuesApi.create`", 1, len(re.findall(r"\breloadVenues\(\)", src_create)))
mesures_ms = vivant("docs/preuves/D327/releve/ma-salle/mesures-ma-salle.txt").decode("utf-8")
for sc, nom in (("S1", "créée, sans salle avant"), ("S2", "créée, avec une salle (menu de compte)"), ("S3", "créée, retour par le lien de l'étape 2")):
    r = listes_ma_salle(mesures_ms, sc)
    ctl(f"Q1-{sc}", f"{nom} : la salle créée est dans la liste SANS rechargement (la création n'est PAS reproduite)", True, any(n.startswith(sc + " ") for n in r.get("SANS rechargement", [])))
for sc, nom in (("S4", "éditée (PATCH 200)"), ("S8", "créée puis corrigée dans la même session")):
    r = listes_ma_salle(mesures_ms, sc)
    ctl(f"Q1-{sc}", f"{nom} : la liste SANS rechargement ≠ la liste APRÈS rechargement (la liste est périmée)", True, r.get("SANS rechargement") != r.get("APRÈS rechargement") and "APRÈS rechargement" in r)
r6 = listes_ma_salle(mesures_ms, "S6")
ctl("Q1-S6", "supprimée depuis l'assistant : la liste SANS rechargement montre ENCORE la salle supprimée, APRÈS rechargement elle est vide", (True, []), (len(r6.get("SANS rechargement", [])) == 1, r6.get("APRÈS rechargement")))
r7 = listes_ma_salle(mesures_ms, "S7")
ctl("Q1-S7", "contrôle — supprimée depuis la LISTE : la liste est à jour sans rechargement (le fournisseur y relit)", [], r7.get("SANS rechargement"))
ctl("Q1-S5", "publiée par l'administrateur : le badge de la liste est périmé SANS rechargement (« En attente de publication ») et à jour après (« Publiée »)", (True, True), ("En attente de publication" in re.search(r"S5 · APRÈS la publication.*", mesures_ms)[0], "Publiée" in re.search(r"S5 · APRÈS rechargement.*", mesures_ms)[0]))
constat("Q1-C1", "LE GESTE EXACT DE KO N'EST PAS CONNU : la création seule n'est reproduite dans aucun des trois parcours rejoués (S1 à S3) ; ce que Ko décrit (« une salle créée n'apparaît qu'après actualisation ») est reproduit pour l'ÉDITION, la CORRECTION après création, la PUBLICATION et la SUPPRESSION DEPUIS L'ASSISTANT (S4, S5, S6, S8). La base de développement de Ko porte, pour « salle koceilaaaaaa » (la seule vivante), une création le 09/10 à 02:23:25 UTC et une modification à 02:32:13 UTC — une INFÉRENCE, pas une preuve, que ce soit ce qu'il a vu.")

# Q2 — le constat navigateur du stepper
print("-- Q2 « 1. 01L'essentiel » : le constat dans un navigateur, exigé AVANT le correctif (décision 11 (a))")
dec11 = re.search(r"11\.[^\n]{0,400}", show(CODE, "ZWADJ_CONTINUITE.md"))
ctl("Q2a", "la consigne (point d'entrée du rang 33) : le défaut est « à CONSTATER dans un navigateur d'abord (décision 11 a), pas à déduire d'une lecture »", True, "à **CONSTATER dans un navigateur d'abord** (décision 11 a)" in CONT_OUV)
ctl("Q2b", "pièces « avant » versées : 9 images dont 8 de l'assistant (4 pleines pages, 4 de la liste d'étapes)", (9, 8), (len(avant), len([f for f in avant if "/assistant-" in f])))
ma_rej = piece("navigateur/captures/mesures-avant-rejoue.txt")
vals = re.findall(r"\"listStyleType\":\"(\w+)\"", ma_rej)
ctl("Q2c", "pièce TEXTE du constat : `mesures-avant-rejoue.txt` mesure `listStyleType` « decimal » sur les 4 lectures (fr/ar × 1280/360)", ["decimal"] * 4, vals)
ctl("Q2d", "…et le texte de chaque entrée y est « 01L'essentiel » (numéro collé au libellé)", True, "01L'essentiel" in ma_rej)
ctl("Q2e", "la mesure TEXTE du constat d'origine (05/10) n'est PAS versée : D326 l'écrit lui-même (`rejouer-avant.py` : « seules ses IMAGES ont été versées ») ; le texte versé est un REJEU du 08/10 contre les sources de HEAD", True, "seules ses IMAGES ont été versées" in show(FIN, f"{PD}/navigateur/rejouer-avant.py"))
ctl("Q2f", "la pièce de rejeu dit contre QUOI elle rejoue : « les sources de HEAD » (en-tête : « Constat « avant » REJOUÉ contre les sources de HEAD »)", True, "Constat « avant » REJOUÉ contre les sources de HEAD" in ma_rej)
non_verifiable("Q2g", "QUAND les 9 images « avant » ont été prises par rapport au correctif : git ne porte que la date du COMMIT qui les ajoute (le commit de code, qui porte aussi le correctif) ; l'identité à l'octet avec le rejeu (K6) en fait la preuve que les images montrent l'état d'AVANT, pas qu'elles aient été prises avant")

# Q3 — la version active
print("-- Q3 LA VERSION ACTIVE : `QUOTE_OPEN_STATUSES`, et ce que rend le PDF d'un devis ACCEPTED puis CANCELLED")
types_fin = show(FIN, "packages/types/src/quote.ts")
ctl("Q3a", "liste EXACTE de QUOTE_OPEN_STATUSES à FIN (lue dans packages/types/src/quote.ts)", ["DRAFT", "SENT"], liste_constante_ts(types_fin, "QUOTE_OPEN_STATUSES"))
ctl("Q3b", "liste de QUOTE_LOST_STATUSES (affaires perdues)", ["CANCELLED", "DECLINED"], liste_constante_ts(types_fin, "QUOTE_LOST_STATUSES"))
pol = show(FIN, "apps/api/src/documents/quote-document-policy.ts")
ctl("Q3c", "le prédicat d'impression de la politique : `isQuoteOpen(status) || status === QuoteStatus.ACCEPTED` (l'ouvert OU l'accepté)", 1, pol.count("return isQuoteOpen(status) || status === QuoteStatus.ACCEPTED;"))
ctl("Q3d", "le RELEVÉ D'OUVERTURE écrivait « la plus haute `version` de sa chaîne ET un statut OUVERT (`QUOTE_OPEN_STATUSES`, l'autorité des quatre commandes) » — l'expression est trouvée à l'ouverture", True, "ET un statut OUVERT** (`QUOTE_OPEN_STATUSES`, l'autorité des quatre commandes)" in aplati(CONT_OUV))
ctl("Q3e", "le CONTRAT d'ouverture écrivait « 409 QUOTE_STATUS_CONFLICT : devis clos (statut non ouvert) » — sans ACCEPTED", True, "devis clos (statut non ouvert)" in aplati(CONT_OUV))
ctl("Q3f", "la décision de la session à ratifier n° 1 écrit « ET un statut ouvert » (sans ACCEPTED) à FIN, dans la section de D326", True, "ET un statut ouvert" in SECT)
ctl("Q3g", "le tableau de la partie B (ligne 3) écrit « un statut ouvert ou accepté » — l'ACCEPTED n'y est dit qu'ICI, au rapport", True, "un statut ouvert ou accepté" in SECT)
ctl("Q3h", "le TEST de la politique porte ACCEPTED « ALLOWED » (quote-document-policy.spec.ts) et la cible PO-3 la neutralise", (True, True), ("ACCEPTED: \"ALLOWED\"" in show(CODE, "apps/api/src/documents/quote-document-policy.spec.ts"), "PO-3" in script and "QuoteStatus.ACCEPTED" in script))
fichiers_prod = [f for f in git("ls-tree", "-r", "--name-only", FIN, "apps/api/src").decode().split("\n") if f and f.endswith(".ts") and not f.endswith(".spec.ts")]
ecritures = [f"{f}: {l.strip()}" for f in fichiers_prod for l in show(FIN, f).split("\n") if ecrit_accepte(l)]
print(f"   (fichiers de production de l'API parcourus pour une écriture de ACCEPTED : {len(fichiers_prod)})")
ctl("Q3i", "AUCUN code de production n'ÉCRIT un statut ACCEPTED sur un devis (`nouveauStatut: ACCEPTED` / `status: ACCEPTED` hors specs) — l'ACCEPTED n'est pas atteignable par le produit aujourd'hui", [], ecritures)
pdf_mes = vivant("docs/preuves/D327/releve/pdf/mesures-pdf.txt").decode("utf-8")
for etiq, attendu in (("DRAFT", (200, None)), ("SENT (hérité)", (200, None)), ("ACCEPTED", (200, None)), ("CANCELLED", (409, "QUOTE_STATUS_CONFLICT")), ("DECLINED (hérité)", (409, "QUOTE_STATUS_CONFLICT")), ("SUPERSEDED (hérité)", (409, "QUOTE_STATUS_CONFLICT"))):
    ctl(f"Q3-{etiq.split()[0]}", f"relevé réel (route du produit, Chromium) : le PDF d'un devis {etiq} → HTTP {attendu[0]}" + (f" {attendu[1]}" if attendu[1] else ""), attendu, statut_http(pdf_mes, etiq))
constat("Q3-C1", "ÉCART : le code (et la spec) impriment un devis ACCEPTED ; le CONTRAT et le relevé d'OUVERTURE disaient « statut ouvert » seulement, et la décision soumise à ratification (n° 1) aussi — l'ACCEPTED n'est dit qu'au tableau de clôture. Il n'est pas atteignable par le produit (Q3i) : il l'a été par SQL dans le relevé (posé, dit).")

imprimes = sorted({re.sub(r" \(hérité\)", "", e) for e in ("DRAFT", "SENT (hérité)", "ACCEPTED", "CANCELLED", "DECLINED (hérité)", "SUPERSEDED (hérité)") if (statut_http(pdf_mes, e) or (0,))[0] == 200})
ctl("Q3j", "les statuts dont le PDF est SERVI (HTTP 200, relevé réel) = QUOTE_OPEN_STATUSES, la définition d'« active » de l'ouverture et de la décision n° 1 (l'ACCEPTED est servi en plus)", sorted(liste_constante_ts(types_fin, "QUOTE_OPEN_STATUSES")), imprimes)

# Q4 — les sept campagnes
print("-- Q4 LES SEPT CAMPAGNES : leurs noms et leurs comptes, lus dans leur journal (`neutralisation/lancer-campagnes.txt`)")
for nom, v in sorted(camp.items()):
    print(f"   · neutralize-{nom}.py : sortie {v[0]} · déclarées {v[1] if v[1] is not None else '— (non déclarées par le harnais)'} · mordues {v[2]} · muettes {v[3]} · non mesurées {v[4]} · {v[5]} s")
print(f"   · total du journal : {tot[1]} mordues · {tot[2]} muettes · {tot[3]} non mesurées · {tot[4]} campagnes · {tot[5]} s")
constat("Q4-C1", "`journey` et `r32` SONT dans les sept (ligne [3/7] et [5/7] du journal) ; `journey` ne déclare pas son compte (« — » dans la colonne « décl ») : « 7/7 » est mordues/jouées, pas mordues/déclarées. `r33` y est à 93 (la partie UNITAIRE), la campagne complète (102) est la pièce `campagne-r33-finale.txt`. `r25`, `r26`, `r29` ne sont pas jouées (le tri ne les cite pas — le journal le dit : « 7 campagne(s) concernée(s) sur 34 »).")

# Q5 — l'extension 5
print("-- Q5 L'EXTENSION 5 : quand a-t-elle été écrite par rapport aux fichiers qu'elle couvre ? ce que git en dit, et ce qu'il n'en dit pas")
log_s = lambda motif, chemin: [l.split()[0] for l in git("log", f"-S{motif}", "--format=%h %ad", "--date=iso", "--", chemin).decode().split("\n") if l.strip()]
ctl("Q5a", "le texte de l'extension 5 (« Précision de la table — les sept SECONDS MEMBRES ») entre dans git UNE seule fois, au commit de CLÔTURE", [FIN], log_s("Précision de la table — les sept SECONDS MEMBRES", "ZWADJ_CONTINUITE.md"))
creations = {}
for f in bares_resolus:
    creations[f] = [l.split()[0] for l in git("log", "--diff-filter=A", "--format=%h", "--", f).decode().split("\n") if l.strip()]
ctl("Q5b", "les sept fichiers que l'extension couvre entrent dans git au commit de CODE (un seul commit chacun)", {f: [CODE] for f in bares_resolus}, creations)
ctl("Q5c", "sept fichiers couverts (les seconds membres de la table, résolus par leur dossier), parcourus", 7, len(creations))
dates = {s: git("log", "-1", "--format=%ad", "--date=iso", s).decode().strip() for s in (CODE, FIN)}
print(f"   (dates de commit : code {dates[CODE]} · clôture {dates[FIN]})")
ctl("Q5d", "l'extension 5 dit elle-même « Écrit APRÈS coup » (la phrase est trouvée dans son texte)", True, "Écrit APRÈS coup" in SECT or "⚠ **Écrit APRÈS coup**" in CONT_FIN)
ctl("Q5e", "les extensions 1 à 4, que D326 dit « déclarées AVANT d'écrire le fichier », entrent TOUTES dans git au commit de CLÔTURE aussi (le texte de chacune n'existe dans aucun commit antérieur)", {k: [FIN] for k in (1, 2, 3, 4)}, {k: log_s(m, "ZWADJ_CONTINUITE.md") for k, m in ((1, "quote-document-fonts.ts"), (2, "76 → 95"), (3, "la largeur du conteneur de l'assistant, 720 → 960 px"), (4, "`packages/api-client/src/quotes-client.test.ts` *(neuf)*"))})
ctl("Q5f", "à l'OUVERTURE, la section « Extensions de la table » existe mais VIDE : « aucune à l'ouverture ; chaque extension s'ajoute ici avec son motif, avant le fichier »", True, "aucune à l'ouverture ; chaque extension s'ajoute ici avec son motif, avant le fichier" in aplati(CONT_OUV))
non_verifiable("Q5g", "L'ORDRE D'ÉCRITURE : git ne connaît que l'ordre des COMMITS (code 12:39:25, clôture 12:39:33, huit secondes d'écart) ; il ne sait ni quand le texte de l'extension 5 (ni des extensions 1 à 4) a été TAPÉ, ni si le fichier a été écrit avant ou après. « Avant l'écriture » (extensions 1 à 4) est donc non vérifiable ; « après coup » (extension 5) est AVOUÉ par son texte et compatible avec l'ordre des commits, sans qu'il le prouve")
constat("Q5-C1", "même limite qu'à D325 (P14b de D326) : la déclaration « AVANT d'écrire le fichier » ne laisse aucune trace que git puisse lire, parce que le texte et le code sont commités ENSEMBLE à quelques secondes d'écart. Une règle dont le respect ne peut pas se lire dans l'historique ne se vérifie que sur déclaration.")
print()

# ══ X — état live ════════════════════════════════════════════════════════════════════════════════════════════════════
print("== X — état LIVE (lu maintenant, pas à un SHA fixé)")
git("fetch", check=False)
ctl("X1", "HEAD local = la clôture de D326", rev(FIN), rev("HEAD"))
ctl("X2", "origin/main = la clôture de D326 (après git fetch)", rev(FIN), rev("origin/main"))
statut = [l for l in git("status", "--porcelain").decode().split("\n") if l.strip()]
hors_lot = [l for l in statut if "docs/preuves/D327/" not in l]
ctl("X3", "arbre propre à l'entrée : aucune entrée de `git status` hors `docs/preuves/D327/` (les pièces de CE lot, non commitées)", [], hors_lot)
ctl("X4", "aucun stash", "", git("stash", "list").decode().strip())
ban = subprocess.run(["pdftotext", "-v"], capture_output=True).stderr.decode("utf-8", errors="replace")
ctl("X5a", "la bannière de `pdftotext` dit « Glyph & Cog » (Xpdf)", True, "Glyph & Cog" in ban)
ctl("X5b", "D326 écrit « poppler » pour cet outil (section D326, preuve de l'arabe) — la mention est trouvée", True, "poppler" in SECT.lower())
constat("X5-C1", "le `pdftotext` du poste est un XPDF 4.00 (bannière « Copyright 1996-2017 Glyph & Cog, LLC »), sans `-bbox` ni `-bbox-layout` ; D326 l'appelle « poppler 4.00 » (section D326, preuve de l'arabe, critère c). Sans conséquence sur ce qu'il a conclu (« rien n'en est conclu »).")
constat("G1-C1", "D326 ne verse AUCUNE pièce brute pour les résultats de ses portes (typecheck, lint, test, build, test:int, e2e) : contrairement à D325 (`resume-portes.txt`). Les écarts de tests sont retrouvés par comptage (G3), les durées et les « 0 » ne le sont pas (G4).")
constat("P8-C1", "`apps/api/package.json` : pnpm a RÉÉCRIT la ligne `prisma:migrate:dev` (le caractère « — » écrit `\\u2014` devenu littéral) en ajoutant `playwright-core` ; le diff compte 2 ajoutées pour 1 retirée alors que D326 annonce UNE dépendance. Équivalent à l'exécution (P8c) ; non déclaré, et c'est la ligne qui porte l'INTERDIT de `migrate dev`.")
constat("A-C1", "l'audit de secrets final (`audit-secrets-d326d.txt`) est commité AVEC le code ; les trois `.md` d'autorité, eux, changent dans le commit SUIVANT (clôture, 8 secondes plus tard) : git ne dit pas si l'audit a vu leurs octets FINAUX.")
non_verifiable("A-N1", "que le dernier audit de secrets de D326 ait couvert les octets finaux des trois `.md` (constat A-C1)")

# ══ Sceaux des audits de D326 ════════════════════════════════════════════════════════════════════════════════════════
print()
print("== A — sceaux des audits scellés de D326")
for s in ("a", "b", "c", "d"):
    nom = f"{PD}/audit-secrets-d326{s}.txt"
    ctl(f"A-{s}", f"le sceau de audit-secrets-d326{s}.txt est recalculé et juste", True, sceau_valide(show_octets(FIN, nom)))

# ══ Bilan ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
print()
print(f"== BILAN : {len(controles)} contrôles · {len(ecarts)} écart(s) de D326 {ecarts} · {len(ecarts_live)} écart(s) de l'état reçu {ecarts_live} · {len(constats)} constat(s) · {len(non_verifiables)} non vérifiable(s)")
print("   ventilation par famille : " + " · ".join(f"{k} {v}" for k, v in sorted(familles.items())) + f"  (somme {sum(familles.values())})")
zero = [k for k in "PGCRKTQXA" if familles.get(k, 0) == 0]
print(f"   familles à zéro (hypothèse à vérifier, D295) : {zero}")
