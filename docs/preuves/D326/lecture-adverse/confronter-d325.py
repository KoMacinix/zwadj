"""D326 — lecture adverse de D325 (rang 32 : réparations de l'app Pro), confrontée aux objets git à des SHA FIXÉS.

POURQUOI IL EXISTE
  Forme de Ko au rang 33 : « la lecture adverse depuis la clôture de D325, EN ENTIER, et EN ENTIER dans ton rapport final ; les chiffres du rapport de D325
  (portes, campagnes, e2e) contre leurs pièces ; que le diff de D325 ne contient que sa table et ses extensions 8, 9 et 10 ; que la spec déplacée existe et se
  rejoue telle qu'écrite ». Le dernier commit est la clôture de D325 (`12593c1`) ; aucun commit ne la suit.
  Chaque affirmation de D325 qui se vérifie dans le dépôt est confrontée à sa SOURCE : les pièces versées de SA passe, les objets git, le texte des fichiers
  d'autorité. Une affirmation qui ne vit que dans le chat est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D326/lecture-adverse/confronter-d325.py > docs/preuves/D326/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF la famille X (état LIVE : `git status`,
  `git stash`, `git rev-parse`, octets des fichiers de l'arbre) et la famille K pour la validité des images (elles se lisent à `12593c1`, pas dans l'arbre).
  AUCUN rejeu de porte ni de campagne ici : le REJEU DE LA SPEC DÉPLACÉE est un geste à part, avec sa propre pièce brute (`rejeu-spec/`).

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d324.py` (D325) — il juge D324 ; une lecture « à l'œil » — elle rate les chiffres et les sources (D320, écart 9 ; D322,
  écart C6). Les assistants (`ctl`, calibration à deux bras, textes aplatis) sont ceux de D325, RÉÉCRITS ici : aucun import, l'instrument de D325 reste une pièce.

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque.
  Les comptes s'impriment avec ce qu'ils ont PARCOURU et leur attendu à côté (D290), et le total des contrôles avec sa ventilation par famille (D295). Un attendu
  est DÉRIVÉ d'une pièce brute — jamais écrit de mémoire (D275) ; les chiffres que D325 ÉCRIT sont extraits de son TEXTE aplati, puis confrontés à la pièce.
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

FIN = "12593c1"     # clôture de D325
CODE = "a48725c"    # le commit de code du rang 32 (partie B)
OUV = "8d3f05d"     # l'ouverture (partie A, documentaire) — là où la table des fichiers attendus est écrite
DEBUT = "9a295a2"   # SHA de départ de D325
PD = "docs/preuves/D325"
AUTORITES = ("AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md")
ANSI = re.compile(r"\x1b\[[0-9;]*m")
ESP = re.compile(r"[\s  ]+")

controles, ecarts, constats, ecarts_live = [], [], [], []
familles: dict = {}


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show_octets(sha, chemin):
    return git("show", f"{sha}:{chemin}")


def show(sha, chemin):
    return show_octets(sha, chemin).decode("utf-8").replace("\r\n", "\n")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def piece(nom):
    return ANSI.sub("", show(FIN, f"{PD}/{nom}"))


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


# ── Extracteurs (chacun calibré plus bas) ────────────────────────────────────────────────────────────────────────────
def resume_vitest(texte):
    t = ANSI.sub("", texte)
    f = [int(m) for m in re.findall(r"Test Files\s+(\d+) passed", t)]
    n = [int(m) for m in re.findall(r"^\s*(?:\[[^\]]+\]\s+)?Tests\s+(\d+) passed", t, flags=re.M)]
    return list(zip(f, n))


def porte(texte, nom):
    """(code, secondes) de « porte <nom> : code N · M s » ; None si la ligne manque."""
    m = re.search(r"^porte " + re.escape(nom) + r" : code (\d+) · (\d+) s$", texte, flags=re.M)
    return (int(m[1]), int(m[2])) if m else None


def paires_resume(texte):
    """Les couples (fichiers, tests) d'un résumé de portes : « [pkg] Test Files  N passed » puis « [pkg] Tests  M passed »."""
    f = re.findall(r"^\s*\[([^\]]+)\] Test Files\s+(\d+) passed", texte, flags=re.M)
    t = re.findall(r"^\s*\[([^\]]+)\] Tests\s+(\d+) passed", texte, flags=re.M)
    return {a: (int(b), dict(t).get(a) and int(dict(t)[a])) for a, b in f}


def playwright_bilan(texte):
    """{échecs, ignorés, non joués, passés} d'un extrait Playwright (dernières lignes « N passed (3.1m) »)."""
    t = ANSI.sub("", texte)
    r = {}
    for cle, motif in (("echecs", r"^\s+(\d+) failed$"), ("ignores", r"^\s+(\d+) skipped$"), ("non_joues", r"^\s+(\d+) did not run$"), ("passes", r"^\s+(\d+) passed \(")):
        m = re.findall(motif, t, flags=re.M)
        r[cle] = int(m[-1]) if m else 0
    return r


def titres_en_echec(texte):
    """Les titres des lignes « x  N [projet] › fichier:ligne:col › titre » (échecs de la liste)."""
    t = ANSI.sub("", texte)
    return re.findall(r"^\s+x\s+\d+ \[[^\]]+\] › ([^:]+)\.e2e\.ts:\d+:\d+ ›", t, flags=re.M)


def bilan(texte):
    m = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) jouée\(s\) · (\d+) non mesurée", texte)
    if m:
        return (int(m[1]), int(m[2]), int(m[3]))
    m = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\)\.", texte)
    return (int(m[1]), int(m[2]), 0) if m else None


def cibles_mordues(texte):
    """Identifiants des lignes « ✓ X-n. libellé » (une par cible mordue)."""
    return re.findall(r"^✓ ([A-Z]+-\d+)\.", texte, flags=re.M)


def tableau_attendu(texte):
    """Les chemins de la PREMIÈRE colonne de la table « Fichiers attendus » (entre son titre et « ⚠ Toute extension »)."""
    m = re.search(r"#### Fichiers attendus.*?\n(.*?)\n⚠ Toute extension", texte, flags=re.S)
    if not m:
        return []
    return re.findall(r"^\| `([^`]+)`", m[1], flags=re.M)


def jeton_chemin(j):
    return bool(re.fullmatch(r"[\w@./-]+\.(?:ts|tsx|json|py|md|css|yaml|mjs)", j))


def extensions(texte):
    """{numéro d'extension: [jetons chemin entre accents graves]} du bloc « Extensions de la table » (items numérotés « N. »)."""
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


def exts_texte(k):
    m = re.search(r"#### Extensions de la table.*?\n(.*?)\n#### Modes de défaillance", CONT_FIN, flags=re.S)
    blocs = re.split(r"(?m)^(?=\d+\. )", m[1])
    return next(b for b in blocs if b.startswith(f"{k}. "))


def png_dims(octets):
    if len(octets) < 24 or octets[:8] != b"\x89PNG\r\n\x1a\n" or octets[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", octets[16:24])


def png_fabrique(w, h):
    """Un PNG minimal valide w×h (une ligne de pixels noirs répétée) — témoin de calibration."""
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
    """Toutes les clés FEUILLES d'un JSON de messages, en chemin pointé."""
    if isinstance(obj, dict):
        out = []
        for k, v in obj.items():
            out += cles_json(v, f"{prefixe}.{k}" if prefixe else k)
        return out
    return [prefixe]


def melange_fins_de_ligne(octets):
    """(CRLF, LF nus) d'un contenu en octets."""
    crlf = octets.count(b"\r\n")
    return crlf, octets.count(b"\n") - crlf


def en_tete_rouge(texte):
    """(code de sortie, échoués, AssertionError, autre) d'une pièce du dossier `rouge/`."""
    c = re.search(r"code de sortie (\d+) · ligne « Tests » : (\d+) failed", texte)
    e = re.search(r"échecs lus : (\d+) \(AssertionError : (\d+) · autre : (\d+)\)", texte)
    if not c or not e:
        return None
    return (int(c[1]), int(c[2]), int(e[2]), int(e[3]))


# ══ CALIBRATION — deux bras par extracteur ; abandon si un seul manque ═════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("vitest positif (ANSI)", resume_vitest("\x1b[2m Test Files \x1b[22m \x1b[1m\x1b[32m59 passed\x1b[39m (59)\n      Tests  667 passed (667)\n"), [(59, 667)])
bras("vitest négatif (un échec : pas de « passed » seul)", resume_vitest(" Test Files  1 failed | 58 passed (59)\n      Tests  3 failed | 664 passed (667)\n"), [])
bras("porte positif", porte("porte lint : code 0 · 12 s\n", "lint"), (0, 12))
bras("porte négatif (une autre porte)", porte("porte lint : code 0 · 12 s\n", "test"), None)
bras("paires de résumé positif", paires_resume("   [apps/api] Test Files  60 passed (60)\n   [apps/api] Tests  729 passed (729)\n"), {"apps/api": (60, 729)})
bras("paires de résumé négatif", paires_resume("rien\n"), {})
bras("playwright positif", playwright_bilan("  2 failed\n  1 skipped\n  2 did not run\n  44 passed (3.5m)\n"), {"echecs": 2, "ignores": 1, "non_joues": 2, "passes": 44})
bras("playwright négatif (rien)", playwright_bilan("rien\n"), {"echecs": 0, "ignores": 0, "non_joues": 0, "passes": 0})
bras("titres en échec positif", titres_en_echec("  x  44 [chromium] › specs\\r32-nouvelle-reservation.e2e.ts:94:5 › le parcours (13ms)\n"), ["specs\\r32-nouvelle-reservation"])
bras("titres en échec négatif (une ligne « ok »)", titres_en_echec("  ok 1 [chromium] › specs\\a.e2e.ts:1:1 › titre (1s)\n"), [])
bras("bilan positif", bilan("65 garde(s) mordue(s) sur 65 cible(s) jouée(s) · 0 non mesurée(s) (attendu : 65 sur 65)"), (65, 65, 0))
bras("bilan positif, forme courte", bilan("4 garde(s) mordue(s) sur 4 cible(s)."), (4, 4, 0))
bras("bilan négatif", bilan("rien"), None)
bras("cibles mordues positif", cibles_mordues("✓ Q-2. un libellé\n   détail\n✓ L-1. un autre\n"), ["Q-2", "L-1"])
bras("cibles mordues négatif (un ✗ et une ligne d'indentation)", cibles_mordues("✗ Q-2. raté\n   ✓ pas au début de ligne\n"), [])
bras("tableau attendu positif", tableau_attendu("#### Fichiers attendus — x\n\n| fichier | pour |\n|---|---|\n| `a/b.ts` | x |\n| `ZW.md` | y |\n\n⚠ Toute extension"), ["a/b.ts", "ZW.md"])
bras("tableau attendu négatif (pas de table)", tableau_attendu("rien"), [])
bras("extensions positif", extensions("#### Extensions de la table — x\n\n1. **`a/b.ts` et `Record<X, Y>`** — m\n2. `c/d.json` seul\n\n#### Modes de défaillance"), {1: ["a/b.ts"], 2: ["c/d.json"]})
bras("extensions négatif", extensions("rien"), {})
bras("png positif (24×7)", png_dims(png_fabrique(24, 7)), (24, 7))
bras("png négatif (pas un PNG)", png_dims(b"GIF89a" + b"\x00" * 30), None)
corps_ok = b"corps\n"
sc_ok = corps_ok + (
    "== SCEAU sha256:{} — neutralisation/audit-secrets.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==\n"
).format(hashlib.sha256(corps_ok).hexdigest()).encode("utf-8")
bras("sceau positif", sceau_valide(sc_ok), True)
bras("sceau négatif (un octet changé)", sceau_valide(sc_ok.replace(b"corps", b"corpS")), False)
bras("clés JSON positif", sorted(cles_json({"a": {"b": "x", "c": {"d": "y"}}, "e": "z"})), ["a.b", "a.c.d", "e"])
bras("clés JSON négatif (un JSON vide)", cles_json({}), [])
bras("fins de ligne : CRLF pur", melange_fins_de_ligne(b"a\r\nb\r\n"), (2, 0))
bras("fins de ligne : un LF nu repéré", melange_fins_de_ligne(b"a\r\nb\n"), (1, 1))
bras("en-tête rouge positif", en_tete_rouge("# code de sortie 1 · ligne « Tests » : 3 failed | 3 passed (6)\n# échecs lus : 3 (AssertionError : 1 · autre : 2) — x"), (1, 3, 1, 2))
bras("en-tête rouge négatif", en_tete_rouge("rien"), None)
if not all(cal):
    sys.exit(f"CALIBRATION : {cal.count(False)} bras manqué(s) — l'instrument ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

# ══ Les textes lus, une fois ══════════════════════════════════════════════════════════════════════════════════════════
CONT_FIN = show(FIN, "ZWADJ_CONTINUITE.md")
CONT_OUV = show(OUV, "ZWADJ_CONTINUITE.md")
CONT_FIN_A = aplati(CONT_FIN)
BLOC = re.search(r"### ⛔ CLÔTURE DU 05/10/2026 \(D325\).*?(?=### ⛔ L'ÉTAT DU RANG, À LIRE EN PREMIER — écrit à l'ouverture)", CONT_FIN, flags=re.S)
if not BLOC:
    sys.exit("le bloc de clôture de D325 est introuvable : l'instrument ne juge pas")
CLOT = aplati(BLOC[0])
SEC = re.search(r"## Session du 04/10/2026 — D325 .*?(?=\n## ~~PROCHAIN LOT~~ — rang 31)", CONT_FIN, flags=re.S)
if not SEC:
    sys.exit("la section D325 est introuvable : l'instrument ne juge pas")
SECT = aplati(SEC[0])
print(f"== texte lu : bloc de clôture {len(CLOT)} caractères · section D325 {len(SECT)} caractères (aplatis)\n")

# ══ P — provenance et diff ════════════════════════════════════════════════════════════════════════════════════════════
print("== P — provenance : les commits de D325 et ce que chacun touche")
parents = lambda sha: git("rev-list", "--parents", "-n", "1", sha).decode().split()[1:]
ctl("P1a", "parent de la clôture = le commit de code", [git("rev-parse", CODE).decode().strip()], parents(FIN))
ctl("P1b", "parent du commit de code = l'ouverture", [git("rev-parse", OUV).decode().strip()], parents(CODE))
ctl("P1c", "parent de l'ouverture = le SHA de départ", [git("rev-parse", DEBUT).decode().strip()], parents(OUV))
ctl("P2", "commits de D325 (DEBUT..FIN)", 3, len(git("rev-list", f"{DEBUT}..{FIN}").decode().split()))
hors_pr = lambda a, b: [n for n in noms_diff(a, b) if not n.startswith("docs/preuves/")]
ctl("P3", "la clôture touche, hors docs/preuves, les trois .md d'autorité et rien d'autre", sorted(AUTORITES), sorted(hors_pr(CODE, FIN)))
ctl("P4", "l'ouverture touche, hors docs/preuves, les trois .md d'autorité et rien d'autre", sorted(AUTORITES), sorted(hors_pr(DEBUT, OUV)))
nb47 = re.search(r"les (\d+) fichiers hors pièces que le commit contiendra", SECT)
ctl("P5", "« 47 fichiers hors pièces » (audit final) = le diff DEBUT..CODE hors docs/preuves", int(nb47[1]) if nb47 else None, len(hors_pr(DEBUT, CODE)))

tables = tableau_attendu(CONT_FIN)
exts = extensions(CONT_FIN)
print(f"   (table lue à {FIN} : {len(tables)} lignes ; extensions lues : {sorted(exts)} — {sum(len(v) for v in exts.values())} jetons chemin)")
ctl("P6a", "la table compte des lignes (l'extracteur a parcouru quelque chose)", True, len(tables) > 30)
ctl("P6b", "dix extensions lues, numérotées 1 à 10", list(range(1, 11)), sorted(exts))
code_b = [n for n in hors_pr(OUV, CODE) if n not in AUTORITES]
bases = {}
for n in git("ls-tree", "-r", "--name-only", FIN).decode().split("\n"):
    if n:
        bases.setdefault(n.rsplit("/", 1)[-1], []).append(n)


def resout(j):
    """Un jeton chemin → le chemin complet : tel quel s'il contient « / », sinon par son nom de fichier s'il est UNIQUE dans l'arbre."""
    if "/" in j:
        return j
    c = bases.get(j, [])
    return c[0] if len(c) == 1 else None


declare = {}   # chemin → ensemble de sources ("table", "ext N")
for t in tables:
    if not t.startswith("docs/preuves/"):
        declare.setdefault(t, set()).add("table")
for k, v in exts.items():
    for j in v:
        r = resout(j)
        if r is None:
            constat(f"P6x{k}", f"extension {k} : le jeton `{j}` n'est PAS un chemin complet et son nom n'est pas unique dans l'arbre : non résolu, listé à part")
        else:
            declare.setdefault(r, set()).add(f"ext {k}")
non_declares = sorted(n for n in code_b if n not in declare)
ctl("P6c", f"diff de la partie B ({len(code_b)} fichiers hors docs/preuves et hors .md) : fichiers NON déclarés (table ou extension)", [], non_declares)
touches_ext = {n: sorted(declare[n]) for n in code_b if n in declare and not ({"table"} & declare[n])}
print("   fichiers du diff couverts PAR UNE EXTENSION seulement (absents de la table) :")
for n, s in sorted(touches_ext.items()):
    print(f"     - {n} ← {', '.join(s)}")
decl_non_touches = sorted(n for n in declare if n not in code_b and n not in AUTORITES)
CITES = {  # (extension, jeton) → le texte qui montre que le jeton est CITÉ et non déclaré — vérifié dans le texte de D325 par le contrôle P6e
    (4, "apps/client/src/lib/login-path-guard.test.ts"): "patron de `login-path-guard.test.ts`",
    (9, "neutralisation/lancer-campagnes.py"): "par `lancer-campagnes.py`",
}
decl_cites = sorted(n for n in declare if n not in code_b and n not in AUTORITES and any(f"ext {k}" in declare[n] and j == n for (k, j) in CITES))
print("   fichiers déclarés (table ou extension) mais NON touchés par le diff de la partie B :")
for n in decl_non_touches:
    print(f"     - {n} ← {', '.join(sorted(declare[n]))}")
ctl("P6d", "déclarés non touchés, une fois écartés les jetons CITÉS (patron, outil) et la destination du déplacement : ceux que D325 explique "
    "(extension 6 : lu non modifié ; extension 10 : spec déplacée, jamais dans la suite)",
    sorted(["apps/pro/src/venues/venue-wizard.test.tsx", "e2e/specs/r32-nouvelle-reservation.e2e.ts"]),
    sorted(n for n in decl_non_touches if n not in decl_cites and not n.startswith("docs/preuves/")))
ctl("P6e", "les deux jetons écartés comme CITÉS le sont bien dans le texte de D325 (« patron de … », « par … »), pas déclarés",
    [True, True], [t in aplati(exts_texte(k)) for (k, _), t in CITES.items()])
ctl("P6f", "la destination du déplacement (extension 10) existe : elle est entrée par la CLÔTURE, pas par le commit de code",
    (False, True), (existe(CODE, f"{PD}/navigateur/r32-nouvelle-reservation.e2e.ts"), existe(FIN, f"{PD}/navigateur/r32-nouvelle-reservation.e2e.ts")))
seulement_8_9_10 = sorted(n for n, s in touches_ext.items() if all(x in ("ext 8", "ext 9", "ext 10") for x in s))
print(f"   couverts par les SEULES extensions 8, 9 ou 10 : {seulement_8_9_10}")

interdits = re.compile(r"^(apps/api/src/venues/|apps/api/prisma/|.*/(quotes\.service|bookings\.service|booking-transitions|pricing-engine|availability-engine)\.ts$)")
tous = noms_diff(DEBUT, FIN)
ctl("P7", f"borne de Ko : aucun fichier de venues/, de migration, de devis, réservations, transitions, tarification ou disponibilité (parcouru {len(tous)} chemins)", [], [n for n in tous if interdits.match(n)])
ctl("P8", "docs/preuves touché par D325 : uniquement docs/preuves/D325/", [], [n for n in tous if n.startswith("docs/preuves/") and not n.startswith("docs/preuves/D325/")])
ctl("P9a", "la spec déplacée n'est PAS dans e2e/specs au commit de clôture", False, existe(FIN, "e2e/specs/r32-nouvelle-reservation.e2e.ts"))
ctl("P9b", "la spec déplacée est dans docs/preuves/D325/navigateur/", True, existe(FIN, f"{PD}/navigateur/r32-nouvelle-reservation.e2e.ts"))
log_spec = git("log", "--name-only", "--format=", f"{DEBUT}..{FIN}", "--", "e2e/specs/r32-nouvelle-reservation.e2e.ts").decode().strip()
ctl("P9c", "aucun commit de D325 n'a jamais posé la spec dans e2e/specs (elle n'y est jamais entrée)", "", log_spec)
for chemin in ("neutralisation/neutralize-act-plafonds.py", "neutralisation/neutralize-horloge.py"):
    d = git("diff", "-U0", DEBUT, CODE, "--", chemin).decode().split("\n")
    moins = [l for l in d if l.startswith("-") and not l.startswith("---")]
    plus = [l for l in d if l.startswith("+") and not l.startswith("+++")]
    ctl("P10-" + chemin.split("-", 1)[1][:4], f"{chemin} : UNE ligne retirée, UNE ajoutée, toutes deux la constante NB_TESTS_ATTENDU, 41 → 76",
        (1, 1, True, True, True), (len(moins), len(plus), "NB_TESTS_ATTENDU = 41" in moins[0] if moins else False, plus[0].startswith("+NB_TESTS_ATTENDU = 76") if plus else False,
                                   len(d) > 0))
num = git("diff", "--numstat", DEBUT, CODE, "--", "e2e/baselines/").decode().split()
ctl("P11a", "tokens.json : 8 insertions, 0 suppression (extension 8) — seul fichier de e2e/baselines touché", ["8", "0", "e2e/baselines/tokens.json"], num)
ctl("P11b", "tokens-divergents.json : contenu identique entre DEBUT et FIN",
    git("show", f"{DEBUT}:e2e/baselines/tokens-divergents.json"), git("show", f"{FIN}:e2e/baselines/tokens-divergents.json"))
decl = lambda sha: len(re.findall(r"^\s*(?:it|test)\(", show(sha, "apps/pro/src/dashboard/walkin-journey.test.tsx"), flags=re.M))
ctl("P12a", "walkin-journey.test.tsx : déclarations it(/test( au départ (D325 écrit 41)", 41, decl(DEBUT))
ctl("P12b", "walkin-journey.test.tsx : déclarations it(/test( au commit de code (D325 écrit 76)", 76, decl(CODE))
ctl("P12c", "le même fichier est inchangé entre le commit de code et la clôture", True, git("diff", "--quiet", CODE, FIN, "--", "apps/pro/src/dashboard/walkin-journey.test.tsx", check=False) == b"")
nf_nouveaux = [l[2:] for l in noms_diff(DEBUT, CODE, statut=True) if l.startswith("A\t") for l in [l] if not l[2:].startswith("docs/preuves/")]
print(f"   fichiers AJOUTÉS hors docs/preuves : {len(nf_nouveaux)}")

_lock = [l for l in git("diff", "-U0", DEBUT, CODE, "--", "pnpm-lock.yaml").decode().split("\n") if re.match(r"^[+-](?![+-])", l)]
ctl("P13a", "extension 1 : le lockfile ne montre QUE le lien de workspace (3 lignes ajoutées, 0 retirée)",
    ["+      '@zwadj/types':", "+        specifier: workspace:*", "+        version: link:../types"], _lock)
_pkg = [l for l in git("diff", "-U0", DEBUT, CODE, "--", "packages/ui/package.json").decode().split("\n") if re.match(r"^[+-](?![+-])", l)]
ctl("P13b", "extension 1 : packages/ui/package.json gagne UNE ligne, la dépendance de workspace", ['+    "@zwadj/types": "workspace:*",'], _pkg)
_ext_ouv = re.search(r"#### Extensions de la table", CONT_OUV)
ctl("P14", "ANTÉRIORITÉ des extensions : à l'ouverture (commit 8d3f05d) la section « Extensions de la table » n'existe pas — les dix entrent AVEC le code", False, bool(_ext_ouv))
constat("P14b", "« déclarée AVANT d'écrire le fichier » (extensions 1 à 10) est NON VÉRIFIABLE par git : les dix déclarations et le code partagent UN commit (`a48725c`) ; seule l'extension 2 "
        "l'avoue (« APRÈS l'écriture ») — ni plus ni moins que ce que le commit permet de dire")

# ══ G — les portes ════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== G — les portes : le texte de D325 contre ses pièces")
res1 = piece("portes/resume-portes.txt")
res2 = piece("portes/resume-portes-arbre-final.txt")
for nom in ("typecheck", "lint", "test", "build"):
    m = re.search(r"`" + re.escape(nom) + r"` \*\*0\*\* \((\d+) s\)", CLOT)
    ctl(f"G-{nom}", f"« {nom} 0 (N s) » du bloc de clôture = la pièce `resume-portes.txt`", (0, int(m[1]) if m else None), porte(res1, nom))
m = re.search(r"`test:int` \*\*0\*\* , \*\*(\d+)/(\d+)\*\*, (\d+) s|`test:int` \*\*0\*\*, \*\*(\d+)/(\d+)\*\*, (\d+) s", CLOT)
g = [x for x in (m.groups() if m else ()) if x]
ctl("G-int-code", "« test:int 0 » = code 0 de la pièce", 0, (porte(res1, "test:int") or (None,))[0])
ctl("G-int-duree", "durée de test:int du texte = la pièce", int(g[2]) if len(g) == 3 else None, (porte(res1, "test:int") or (None, None))[1])
pi = paires_resume(res1[res1.index("## test:int"):])
ctl("G-int-comptes", "« 444/36 » = la pièce (fichiers, tests)", (int(g[1]), int(g[0])) if len(g) == 3 else None, pi.get("apps/api"))
pt = paires_resume(res1[res1.index("## test :"):res1.index("## test:int")])
txt = re.search(r"API \*\*(\d+)/(\d+)\*\* \(\+(\d+)/\+(\d+)\), api-client \*\*(\d+)/(\d+)\*\* \((\d+)\), client \*\*(\d+)/(\d+)\*\* \(\+(\d+)/\+(\d+)\), pro \*\*(\d+)/(\d+)\*\* \(\+(\d+)/\+(\d+)\)", CLOT)
base = re.search(r"base d'entrée \*\*lue\*\* sur le journal de la certification de D324 \((\d+)/(\d+) · (\d+)/(\d+) · (\d+)/(\d+) · (\d+)/(\d+)\)", CLOT)
print(f"   (comptes du texte lus : {'oui' if txt else 'NON'} ; base d'entrée lue : {'oui' if base else 'NON'})")
if txt and base:
    t = [int(x) for x in txt.groups()]
    b = [int(x) for x in base.groups()]
    ordre = ["apps/api", "packages/api-client", "apps/client", "apps/pro"]
    ctl("G-test-comptes", "API 729/60 · api-client 39/4 · client 372/29 · pro 457/34 (tests, fichiers) = la pièce",
        [(t[0], t[1]), (t[4], t[5]), (t[7], t[8]), (t[11], t[12])], [(pt[k][1], pt[k][0]) for k in ordre])
    j324 = resume_vitest(show(FIN, "docs/preuves/D324/passe-r31a-20261004-1855/test.log"))
    ctl("G-base", "base d'entrée du texte « tests/fichiers » (667/59 · 39/4 · 344/25 · 352/30) = les quatre paires (fichiers, tests) du journal de la certification de D324 (parcouru : "
        f"{len(j324)} résumés)", sorted([(b[1], b[0]), (b[3], b[2]), (b[5], b[4]), (b[7], b[6])]), sorted(j324))
    ctl("G-deltas", "les écarts écrits (+62/+1 · 0 · +28/+4 · +105/+4) = comptes de la pièce − base du texte",
        [(t[2], t[3]), (t[6],), (t[9], t[10]), (t[13], t[14])],
        [(pt["apps/api"][1] - b[0], pt["apps/api"][0] - b[1]), (pt["packages/api-client"][1] - b[2],), (pt["apps/client"][1] - b[4], pt["apps/client"][0] - b[5]),
         (pt["apps/pro"][1] - b[6], pt["apps/pro"][0] - b[7])])
dur_final = re.search(r"durées (\d+), (\d+), (\d+) et (\d+) s", SECT)
ctl("G-final-codes", "arbre final : typecheck, lint, test, build à 0", [(0, ), (0, ), (0, ), (0, )], [(porte(res2, n + " (finale)") or (None,))[:1] for n in ("typecheck", "lint", "test", "build")])
ctl("G-final-durees", "durées « 37, 18, 98 et 74 s » du texte = la pièce de l'arbre final",
    [int(x) for x in dur_final.groups()] if dur_final else None, [(porte(res2, n + " (finale)") or (None, None))[1] for n in ("typecheck", "lint", "test", "build")])
ctl("G-final-comptes", "arbre final : mêmes comptes que la première passe (729/60 · 39/4 · 372/29 · 457/34)", paires_resume(res2[res2.index("## test :"):res2.index("## test:int")]), pt)
for nom, motif in (("typecheck", r"## typecheck : (\d+) lignes examinées · paquets lancés (\d+) · finis « Done » (\d+)"), ("lint", r"## lint : (\d+) lignes examinées · paquets lancés (\d+) · finis « Done » (\d+)"),
                   ("build", r"## build : (\d+) lignes examinées · paquets lancés (\d+) · finis « Done » (\d+)")):
    for etiq, res in (("première", res1), ("finale", res2)):
        mm = re.search(motif, res)
        ctl(f"G-done-{nom}-{etiq[:3]}", f"{nom} ({etiq}) : paquets lancés = finis « Done » (lignes parcourues {mm[1] if mm else '?'})", True, bool(mm) and mm[2] == mm[3] and int(mm[2]) > 0)

# ══ E — l'e2e ═════════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== E — l'e2e : trois passes, aucune verte")
e = [playwright_bilan(piece(f"e2e/porte-e2e-passe-{i}.txt")) for i in (1, 2, 3)]
t3 = re.search(r"\*\*42 passés, 1 échec, 1 ignoré\*\*", CLOT) or re.search(r"42 passés, 1 échec, 1 ignoré", CLOT)
ctl("E1", "passe 1 : « 2 échecs » (B7 et r32)", (2, ["b7-token-contract", "r32-nouvelle-reservation"]),
    (e[0]["echecs"], sorted(re.sub(r"^specs.", "", x) for x in titres_en_echec(piece("e2e/porte-e2e-passe-1.txt")))))
ctl("E2", "passe 2 : « 1 échec » (r32)", (1, ["r32-nouvelle-reservation"]), (e[1]["echecs"], sorted(re.sub(r"^specs.", "", x) for x in titres_en_echec(piece("e2e/porte-e2e-passe-2.txt")))))
ctl("E3", "passe 3 : « 42 passés, 1 échec, 1 ignoré » (r25-lien-connexion)", (bool(t3), 42, 1, 1, ["r25-lien-connexion"]),
    (bool(t3), e[2]["passes"], e[2]["echecs"], e[2]["ignores"], sorted(re.sub(r"^specs.", "", x) for x in titres_en_echec(piece("e2e/porte-e2e-passe-3.txt")))))
ctl("E4", "codes de sortie de l'e2e dans la pièce : 1, 1, 1 (une porte NON verte, comme le texte le dit)", [(1,), (1,), (1,)],
    [(porte(res1, "test:e2e" + s) or (None,))[:1] for s in ("", " (2e passe)", " (3e passe, suite livrée)")])
ctl("E5", "le texte écrit « Cette porte n'est pas verte, et ce fichier ne l'écrit pas vert »", True, "Cette porte n'est pas verte" in CLOT)
ctl("E6", "r25-lien-connexion échoue à « with timeout 7000ms » (passe 3) — « dépasse son attente de 7 s »", 1, len(re.findall(r"with timeout 7000ms", piece("e2e/porte-e2e-passe-3.txt"))))
_ec = [len(re.findall(r"read ECONNRESET", piece(f"e2e/porte-e2e-passe-{i}.txt"))) for i in (1, 2)]
print(f"   (occurrences de « read ECONNRESET » : passe 1 → {_ec[0]}, passe 2 → {_ec[1]} ; chaque bloc l'écrit deux fois : l'erreur et sa « [cause] »)")
ctl("E7", "ECONNRESET est lu dans le bloc d'échec de r32 des passes 1 et 2 (au moins une fois chacune, pas dans la passe 3)", (True, True, 0), (_ec[0] >= 1, _ec[1] >= 1, len(re.findall(r"ECONNRESET", piece("e2e/porte-e2e-passe-3.txt")))))
cmp_ = piece("e2e/comparaison-lien-connexion-lot-contre-head.txt")
fr_lot = sorted(float(x) for x in re.findall(r"^LOT   fr : \[([^\]]+)\]", cmp_, flags=re.M)[0].split(","))
fr_head = sorted(float(x) for x in re.findall(r"^HEAD  fr : \[([^\]]+)\]", cmp_, flags=re.M)[0].split(","))
ctl("E8", "« lot 10,6–10,9 s, HEAD 10,5–13,1 s » = la pièce de comparaison", ("10,6–10,9", "10,5–13,1"),
    (f"{fr_lot[0]:.1f}–{fr_lot[-1]:.1f}".replace(".", ","), f"{fr_head[0]:.1f}–{fr_head[-1]:.1f}".replace(".", ",")))
ctl("E8b", "le texte écrit bien « lot 10,6–10,9 s » et « HEAD 10,5–13,1 s »", True, "lot 10,6–10,9 s" in CLOT and "10,5–13,1 s" in CLOT)

# ══ C — les campagnes ═════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== C — les campagnes : le texte contre les journaux versés")
cr = piece("neutralisation/campagne-r32.txt")
ctl("C1", "« neutralize-r32.py 65 mordues sur 65 » = le bilan du journal", (65, 65, 0), bilan(cr))
ids = cibles_mordues(cr)
ctl("C2", f"identifiants de cibles mordues du journal r32 : 65, tous distincts (parcouru : {len(ids)})", (65, 65), (len(ids), len(set(ids))))
ctl("C3", "les quatre cibles retirées (Q-5, Q-7, Q-8, Q-10) n'apparaissent PAS dans le journal ; T-5 (réorientée) y est", ([], True), ([x for x in ("Q-5", "Q-7", "Q-8", "Q-10") if x in ids], "T-5" in ids))
emp = re.search(r"empreintes : (\d+) fichier\(s\) ciblé\(s\) comparé\(s\) au départ · (\d+) différent\(s\) \(attendu 0\)", cr)
ctl("C4", "« 14 fichiers mutés, restauration 14/14 » = la ligne d'empreintes du journal", (14, 0), (int(emp[1]), int(emp[2])) if emp else None)
ctl("C5", "« arbre rendu à son état de départ : vérifié » (journal r32)", True, "arbre rendu à son état de départ : vérifié" in cr)
cr1 = piece("neutralisation/campagne-r32-passe-1-62-cibles.txt")
ctl("C6", "la première passe de r32 jouait 62 cibles (le nom de la pièce), la finale 65", (62, 65), (bilan(cr1)[0], bilan(cr)[0]))
lc = piece("campagnes/lancer-campagnes-passe-1.txt")
ctl("C7", "« les huit campagnes touchées par le diff » = « 8 campagne(s) concernée(s) sur 33 » du tri", 8, int(re.search(r"→ (\d+) campagne\(s\) concernée\(s\) sur 33", lc)[1]))
lignes_tab = {m[1]: (int(m[2]), m[3], int(m[4]), int(m[5]), int(m[6])) for m in re.finditer(r"^neutralize-([\w-]+)\.py\s+(\d+)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+$", lc, flags=re.M)}
ctl("C8", "tableau de lancer-campagnes parcouru : huit lignes", 8, len(lignes_tab))
for nom, mord in (("journey", 7), ("r29", 15), ("r30", 8), ("solid-s1", 2)):
    lg = lignes_tab.get(nom)
    ctl(f"C9-{nom}", f"« {nom} {mord}/{mord} » : {mord} mordues, 0 muette, 0 non mesurée au tri (sortie 0)", (0, mord, 0, 0), (lg[0], lg[2], lg[3], lg[4]) if lg else None)
ctl("C10", "act-plafonds et horloge REFUSENT au tri (sortie 1, 0 mordue) — le texte dit « après relevé de leur compte figé »", ((1, 0), (1, 0)), tuple((lignes_tab[k][0], lignes_tab[k][2]) for k in ("act-plafonds", "horloge")))
rj = piece("campagnes/act-plafonds-et-horloge-rejeu.txt")
bs = re.findall(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\)\.", rj)
ctl("C11", "rejeu après relevé : act-plafonds 4/4 et horloge 2/2, codes 0", ([("4", "4"), ("2", "2")], 2), (bs, len(re.findall(r"^exit=0$", rj, flags=re.M))))
r25 = piece("campagnes/r25-e2e.txt")
ctl("C12", "« r25 10/10 avec --e2e (R25-8, non mesurée) » = le bilan de la pièce", (10, 10, 1), bilan(r25)[:2] + (len(re.findall(r"NON MESURÉE", r25)),))
ctl("C13", "r25 au tri : 7 mordues et 4 non mesurées (sortie 3) — la raison du rejeu avec --e2e", (3, 7, 4), (lignes_tab["r25"][0], lignes_tab["r25"][2], lignes_tab["r25"][4]))
neg = piece("neutralisation-e2e/rejouer.py") if False else None
n_e2e = [len(re.findall(r"restauration prouvée par l'empreinte : OUI · code de sortie e2e : 1", piece(f"neutralisation-e2e/E-{i}.txt"))) for i in range(1, 6)]
ctl("C14", "cinq neutralisations e2e à la main (E-1 à E-5) : restauration prouvée, code e2e 1, chacune", [1, 1, 1, 1, 1], n_e2e)
ctl("C15", "ces cinq pièces portent chacune un bloc d'échec « Expected » ou « Error » (parcouru : 5 pièces)", 5,
    sum(1 for i in range(1, 6) if re.search(r"Expected|Error:|expect\(", piece(f"neutralisation-e2e/E-{i}.txt"))))

# ══ R — le rouge lu ═══════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== R — le rouge LU contre le composant d'avant")
rouges = sorted(n.rsplit("/", 1)[-1] for n in git("ls-tree", "-r", "--name-only", FIN, f"{PD}/rouge/").decode().split("\n") if n.endswith(".txt") and "/passe-1-tout-ensemble/" not in n)
ctl("R1", "« onze fichiers » de rouge = pièces .txt du dossier rouge/ (hors la première passe défectueuse)", 11, len(rouges))
resultats_r = {n: en_tete_rouge(piece(f"rouge/{n}")) for n in rouges}
ctl("R2", "chaque pièce de rouge porte un en-tête lisible, code de sortie 1 et au moins un test en échec (parcouru : %d)" % len(rouges), True,
    all(v is not None and v[0] == 1 and v[1] >= 1 for v in resultats_r.values()))
ctl("R3", "point 14 : « 3 échecs » (edit-venue-save)", 3, resultats_r["pro-edit-venue-save.txt"][1])
ctl("R4", "point 7 : « 20 échecs dont 6 AssertionError » (calendar-style)", (20, 6), resultats_r["pro-calendar-style.txt"][1:3])
ctl("R5", "point 2 : « 3 AssertionError » (api-contact-serveur)", 3, resultats_r["api-contact-serveur.txt"][2])
src = re.search(r"SOURCES = sorted\(\{s for _, _, _, srcs in TESTS for s in srcs\}\)", show(FIN, f"{PD}/rouge/rouge.py"))
cst = re.findall(r'^[A-Z_]+ = "((?:apps|packages)/[^"]+)"$', show(FIN, f"{PD}/rouge/rouge.py"), flags=re.M)
ctl("R6", "« restauration 12 sur 12 » : les sources distinctes de rouge.py (calcul de structure, pas une sortie versée)", (True, 12), (bool(src), len(set(cst))))
ctl("R7", "…et une SORTIE VERSÉE portant la ligne « restauration : 12 fichier(s) identique(s) au départ sur 12 »", True,
    any("identique(s) au départ sur 12" in show(FIN, n) for n in git("ls-tree", "-r", "--name-only", FIN, f"{PD}/rouge/").decode().split("\n") if n.endswith(".txt")))

# ══ K — les captures ══════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== K — les captures")
pngs = [n for n in git("ls-tree", "-r", "--name-only", FIN, f"{PD}/navigateur/").decode().split("\n") if n.endswith(".png")]
ctl("K1", "« 26 images » = les .png du dossier navigateur/", 26, len(pngs))
dims = {n.rsplit("/", 1)[-1]: png_dims(show_octets(FIN, n)) for n in pngs}
ctl("K2", f"toutes sont des PNG valides (octets lus : {sum(len(show_octets(FIN, n)) for n in pngs)})", [], [n for n, d in dims.items() if d is None])
paires = {}
for n, d in dims.items():
    paires.setdefault(re.sub(r"-(fr|ar)\.png$", "", n), {})[n[-6:-4]] = d
ctl("K3", "13 paires français/arabe, de même LARGEUR (la hauteur d'une pleine page dépend de la langue)", (13, []), (len(paires), [k for k, v in paires.items() if set(v) != {"fr", "ar"} or v["fr"][0] != v["ar"][0]]))
print("   dimensions (fr / ar) : " + " · ".join(f"{k} {v['fr'][0]}x{v['fr'][1]} / {v['ar'][0]}x{v['ar'][1]}" for k, v in sorted(paires.items())))
largeurs = sorted({d[0] for d in dims.values() if d})
print(f"   largeurs relevées : {largeurs} (le texte : « 1 280 et 360 px, drapeau en gros plan »)")
ctl("K4", "les largeurs 1 280 et 360 sont toutes deux présentes", (True, True), (1280 in largeurs, 360 in largeurs))
constat("K5", "`client-01-demande-360-{fr,ar}.png` mesurent 320 px de large dans une fenêtre de 360 : le script photographie un ÉLÉMENT (le panneau, `photo(panneau, …)`), pas la page ; "
        "le « 360 px » du Client est donc celui de la FENÊTRE, la largeur de l'image est celle du panneau. Aucune capture du panneau de visite (le texte l'avoue : « ni capture ni e2e »).")

# ══ A — les audits ════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== A — les audits")
for n in ("audit-secrets-d325a.txt", "audit-secrets-final.txt"):
    ctl("A-sceau-" + n[14:19], f"sceau de {n} recalculé", True, sceau_valide(show_octets(FIN, f"{PD}/{n}")))
av = piece("aucune-valeur-reelle-final.txt")
mv = re.search(r"== valeurs cherchées : (\d+) \((\d+) journal/journaux\) · parcourus : (\d+) fichiers, (\d+) octets · porteurs : (\d+)", av)
mt = re.search(r"\*\*(\d+) valeurs\*\* cherchées dans \*\*(\w+) journaux e2e bruts\*\*.*?contre \*\*(\d+) fichiers, ([\d  ]+) octets\*\*", SECT)
ctl("A1", "« 135 valeurs, 0 porteur » : les valeurs cherchées et les porteurs du texte = la pièce", (135, 0), (int(mv[1]), int(mv[5])) if mv else None)
ctl("A2", "le texte écrit « 149 fichiers, 6 451 423 octets » ; la pièce rend ?", (int(mt[3]), entier(mt[4])) if mt else None, (int(mv[3]), int(mv[4])) if mv else None)
tri = piece("tri-audit-final.txt")
ctl("A3", "tri différentiel final : « alertes ABSENTES de la précédente : 0 »", 0, int(re.search(r"alertes ABSENTES de la précédente : (\d+)", tri)[1]))
ctl("A4", "fichiers de docs/preuves/D325 au commit de code + après : 13 puis 106 (le texte compte 149 − 47 = 102 à l'audit ; la différence est ce qui s'est versé APRÈS)", (13, 106),
    (len(git("ls-tree", "-r", "--name-only", CODE, PD).decode().split()), len(git("ls-tree", "-r", "--name-only", FIN, PD).decode().split())))

# ══ T — le texte ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== T — le texte des fichiers d'autorité")
reg = re.findall(r"^\| (D\d+) \| A \|", CONT_FIN, flags=re.M)
ctl("T1", f"registre : la dernière ligne est D325 (lignes parcourues {len(reg)})", "D325", reg[-1] if reg else None)
_ordre = re.search(r"\n## ORDRE DES RANGS.*?(?=\n## )", CONT_FIN, flags=re.S)
dern_rang = re.findall(r"⇒ \*\*RANG (\d+) : EN ATTENTE D'ARBITRAGE DE KO\*\*", _ordre[0]) if _ordre else []
ctl("T2", f"ordre des rangs (section « ## ORDRE DES RANGS » SEULE, {len(_ordre[0]) if _ordre else 0} caractères) : la dernière ligne « ⇒ RANG N : EN ATTENTE » dit 33 (occurrences parcourues {len(dern_rang)})", "33", dern_rang[-1] if dern_rang else None)
ctl("T3", "le bloc de clôture écrit le compteur « ZÉRO → UN »", True, bool(re.search(r"compteur[^.]{0,60}ZÉRO → UN", CLOT)))
AG = show(FIN, "AGENTS.md")
ctl("T4", "AGENTS.md porte l'annotation « rang 32 CLOS » et l'invariant du téléphone (D325, rang 32)", (True, True), ("rang 32 CLOS" in aplati(AG), "PHONE_COUNTRIES" in AG))
ar_d, ar_f = json.loads(show(DEBUT, "packages/i18n/messages/ar.json")), json.loads(show(CODE, "packages/i18n/messages/ar.json"))
fr_d, fr_f = json.loads(show(DEBUT, "packages/i18n/messages/fr.json")), json.loads(show(CODE, "packages/i18n/messages/fr.json"))
neuf_ar = sorted(set(cles_json(ar_f)) - set(cles_json(ar_d)))
neuf_fr = sorted(set(cles_json(fr_f)) - set(cles_json(fr_d)))
m31 = re.search(r"\*\*Les (\d+) clés arabes neuves ne sont pas relues\*\*", SECT)
ctl("T5", f"« 31 clés arabes neuves » = les clés de ar.json absentes au départ (clés parcourues : {len(cles_json(ar_f))})", int(m31[1]) if m31 else None, len(neuf_ar))
ctl("T6", "parité : les clés neuves de fr et de ar sont les mêmes", [], sorted(set(neuf_fr) ^ set(neuf_ar)))
ctl("T7", "parité à la clôture : fr.json et ar.json portent exactement les mêmes clés", [], sorted(set(cles_json(fr_f)) ^ set(cles_json(ar_f))))
# T8 — les décisions « À RATIFIER PAR KO » : le bloc de clôture et la section doivent en compter le même nombre
_liste_clot = re.search(r"Décisions de la session À RATIFIER PAR KO\*\* \(détail[^)]*\) : (.*?)(?= ⇒ \*\*À ORDONNER PAR KO)", CLOT)
_n_clot = len(re.findall(r"\((\d)\) ", _liste_clot[1])) if _liste_clot else None
_liste_sec = re.search(r"#### Ce que la session a décidé SEULE.*?\n(.*?)\n#### Fautes de la session", CONT_FIN, flags=re.S)
_n_sec = len(re.findall(r"^\d+\. ", _liste_sec[1], flags=re.M)) if _liste_sec else None
ctl("T8", "décisions « à ratifier » : le bloc de clôture en écrit autant que la section « Ce que la session a décidé SEULE » n'en numérote", _n_sec, _n_clot)
retire = [k for k in cles_json(fr_f) if k == "venue.ui.walkin.clientNeeded"]
print(f"   clé `venue.ui.walkin.clientNeeded` présente à la clôture : {bool(retire)} (le backlog la dit sans consommateur ; ce lot la retire — décision 13)")
touches_json = [n for n in ("packages/i18n/messages/fr.json", "packages/i18n/messages/ar.json") if n in hors_pr(DEBUT, CODE)]
print(f"   catalogues touchés par D325 : {touches_json}")

# ══ F — fins de ligne des fichiers de code touchés (arbre de travail) ═════════════════════════════════════════════════
print("\n== F — fins de ligne des fichiers de code touchés par D325 (octets de l'ARBRE de travail ; docs/preuves est hors règle : -text)")
melanges, parcourus = [], 0
for n in code_b:
    if not os.path.exists(n):
        continue
    crlf, lf = melange_fins_de_ligne(open(n, "rb").read())
    parcourus += 1
    if crlf and lf:
        melanges.append((n, crlf, lf))
ctl("F1", f"aucun fichier de code touché ne mêle CRLF et LF nu (fichiers parcourus : {parcourus} sur {len(code_b)})", [], melanges)

# ══ X — l'état reçu (LIVE) ════════════════════════════════════════════════════════════════════════════════════════════
print("\n== X — l'état reçu — LIVE (ce que la session a reçu)")
git("fetch", "--quiet", check=False)
ctl("X1", "HEAD = origin/main", git("rev-parse", "origin/main").decode().strip(), git("rev-parse", "HEAD").decode().strip())
ctl("X2", "HEAD est la clôture de D325", git("rev-parse", FIN).decode().strip(), git("rev-parse", "HEAD").decode().strip())
suivis = [l for l in git("status", "--porcelain", "--untracked-files=no").decode().split("\n") if l.strip()]
ctl("X3", "aucun fichier SUIVI modifié", [], suivis)
non_suivis = [l[3:] for l in git("status", "--porcelain").decode().split("\n") if l.startswith("??")]
print(f"   fichiers non suivis à la lecture : {non_suivis}")
ctl("X4", "le seul chemin non suivi est le dossier de CE lot (docs/preuves/D326/)", True, all(n.startswith("docs/preuves/D326/") for n in non_suivis))
ctl("X5", "aucun stash", "", git("stash", "list").decode().strip())

REJEU = "docs/preuves/D326/lecture-adverse/rejeu-spec/extrait-rejeu.txt"
SPEC = f"{PD}/navigateur/r32-nouvelle-reservation.e2e.ts"
CONF = f"{PD}/navigateur/playwright.capture.config.ts"
ctl("X6", "la spec déplacée de l'ARBRE a exactement les octets de l'objet git de la clôture — rejouée « telle qu'écrite », non retouchée",
    (show_octets(FIN, SPEC), show_octets(FIN, CONF)), (open(SPEC, "rb").read(), open(CONF, "rb").read()))
extrait = ANSI.sub("", open(REJEU, encoding="utf-8").read())
res = re.findall(r"^\s+(ok|x)\s+\d+ \[chromium\] › \.\.\\docs\\preuves\\D325\\navigateur\\r32-nouvelle-reservation\.e2e\.ts:(\d+):\d+ ›", extrait, flags=re.M)
spec_lignes = show(FIN, SPEC).split("\n")
ctl("X7a", "le rejeu versé : 5 résultats, tous « ok », « 5 passed », 0 bloc d'échec",
    (5, ["ok"] * 5, 1, 0), (len(res), [r[0] for r in res], len(re.findall(r"^\s+5 passed \(", extrait, flags=re.M)), len(re.findall(r"^\s+x\s", extrait, flags=re.M))))
ctl("X7b", "chaque résultat du rejeu pointe une ligne de la spec qui OUVRE un test (`test(`) — les numéros de ligne viennent de la pièce, pas de ma mémoire",
    [True] * 5, [spec_lignes[int(r[1]) - 1].lstrip().startswith("test(") for r in res])
ctl("X7c", "le nombre de `test(` au niveau de la spec (indentation de 2 espaces ou moins) = 5 résultats", 5, len([l for l in spec_lignes if re.match(r"^ {0,2}test\(", l)]))

# ══ Bilan ════════════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== BILAN")
print(f"{len(controles)} contrôles · {len(ecarts)} écart(s) de D325 : {ecarts} · {len(ecarts_live)} écart(s) de l'état reçu : {ecarts_live} · {len(constats)} constat(s) : {constats}")
print("ventilation : " + " · ".join(f"{k} {v}" for k, v in sorted(familles.items())) + f" (somme {sum(familles.values())} ; motifs à zéro : {[k for k in 'PGECRKATFX' if k not in familles]})")
sys.exit(0 if not ecarts_live else 1)
