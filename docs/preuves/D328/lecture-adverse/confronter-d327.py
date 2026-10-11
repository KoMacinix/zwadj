"""D328 — lecture adverse de D327 (rang 34 : le relevé du PDF, du nom du client, de la référence, de « Ma salle » et des clients côté Pro), confrontée aux objets git à des SHA FIXÉS.

POURQUOI IL EXISTE
  Forme de Ko au rang 35 : « la lecture adverse depuis la clôture de D327, EN ENTIER, et EN ENTIER dans ton rapport final ; instrument versé ; objets git lus à des SHA fixés ; chaque extracteur
  calibré sur un cas vrai et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré ; aucune porte ni campagne rejouée ».
  Le dernier commit est la clôture de D327 (`ab8e6f6`) ; aucun commit ne la suit, sinon la table d'ouverture de CE lot (`220557e`, qui ne contient qu'elle). Chaque affirmation de D327 qui se vérifie
  dans le dépôt est confrontée à sa SOURCE : les pièces versées de SA passe, les objets git, le code cité à la ligne, le texte des fichiers d'autorité. Une affirmation qui ne vit que dans le chat est
  déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D328/lecture-adverse/confronter-d327.py > docs/preuves/D328/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF : (1) la famille X (état LIVE : `git status`, `stash`, `fetch`, `rev-parse`) ;
  (2) la famille L (état VIVANT de la base de développement : `SELECT` seulement, dans une session en lecture seule) ; (3) les fins de ligne des trois `.md` (famille P), lues sur l'arbre : les objets
  git sont normalisés en LF par `core.autocrlf=true` (défaut n° 2 de la lecture adverse de D327). AUCUN rejeu de porte ni de campagne ici.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d326.py` (D327) — il juge D326, et il lit des objets qui n'existent plus à ce SHA ; une lecture « à l'œil » — elle rate les chiffres et les sources.
  Les assistants (`ctl`, calibration à deux bras, textes aplatis) sont ceux de D327, RÉÉCRITS ici : aucun import, l'instrument de D327 reste une pièce.

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils ont
  PARCOURU et leur attendu à côté (D290), le total des contrôles avec sa ventilation par famille (D295). Un attendu est DÉRIVÉ d'une pièce brute ou du texte de D327 — jamais écrit de mémoire (D275).
"""
import hashlib
import json
import math
import os
import re
import struct
import subprocess
import sys
import zlib

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

FIN = "ab8e6f6"       # clôture de D327
PIECES = "4743d79"    # le commit des pièces de D327 (avant toute écriture d'autorité)
DEBUT = "470e607"     # clôture de D326 = SHA de départ de D327
TABLE = "220557e"     # la table d'ouverture de D328 (seule)
PD = "docs/preuves/D327"
AUTORITES = ("AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md")
ANSI = re.compile(r"\x1b\[[0-9;]*m")

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


def blob(sha, chemin):
    return git("rev-parse", f"{sha}:{chemin}").decode().strip()


def piece(nom, sha=FIN):
    return ANSI.sub("", show(sha, f"{PD}/{nom}"))


def aplati(t):
    return re.sub(r"\s+", " ", t)


def noms_diff(a, b, statut=False):
    sortie = git("diff", "--name-status" if statut else "--name-only", a, b).decode("utf-8").split("\n")
    return [l for l in sortie if l.strip()]


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
def bilan_texte(texte):
    """(contrôles, écarts, état reçu, constats, non vérifiables) de « N contrôles · N écarts de D326 · N écart de l'état reçu · N constats · N non vérifiables » ; None si absent."""
    m = re.search(r"(\d+) contrôles · (\d+) écarts? de D\d+ · (\d+) écarts? de l'état reçu · (\d+) constats · (\d+) non vérifiables", texte)
    return None if not m else tuple(int(x) for x in m.groups())


def ventilation(texte):
    """{famille: n} de « ventilation : A 4 · C 21 · … (somme 139) » ; None si absente."""
    m = re.search(r"ventilation[^:]*: ((?:[A-Z] \d+ · )*[A-Z] \d+)\s+\(somme (\d+)\)", texte)
    if not m:
        return None
    return {k: int(v) for k, v in re.findall(r"([A-Z]) (\d+)", m[1])}, int(m[2])


def tally_sortie(texte):
    """(✓ de contrôle, ✗, bras de calibration ✓, constats, non vérifiables) d'une sortie de lecture adverse : les contrôles commencent à la colonne 0, la calibration par trois espaces."""
    return (
        len(re.findall(r"^✓ ", texte, flags=re.M)),
        len(re.findall(r"^✗ ", texte, flags=re.M)),
        len(re.findall(r"^   ✓ ", texte, flags=re.M)),
        len(re.findall(r"^· ", texte, flags=re.M)),
        len(re.findall(r"^\? ", texte, flags=re.M)),
    )


def liste_constante_ts(texte, nom):
    m = re.search(r"export const " + re.escape(nom) + r"\s*=\s*\[([^\]]*)\]\s*as const", texte)
    return None if not m else re.findall(r"\b\w+\.(\w+)\b", m[1])


def ecrit_accepte(ligne):
    return re.search(r"(?:nouveauStatut|status)\s*:\s*(?:QuoteStatus\.ACCEPTED|\"ACCEPTED\")", ligne) is not None


def lignes_de(texte, debut, fin):
    """Les lignes numérotées de `debut` à `fin` (1-indexées, incluses), jointes par '\\n'."""
    l = texte.split("\n")
    return "\n".join(l[debut - 1 : fin])


def decorateurs_routes(texte):
    """Le nombre de décorateurs de route (`@Get(`, `@Post(`, `@Put(`, `@Patch(`, `@Delete(`) en début de ligne (indentation permise)."""
    return len(re.findall(r"^\s*@(?:Get|Post|Put|Patch|Delete)\(", texte, flags=re.M))


def champs_scalaires_modele(schema, modele):
    """Les champs SCALAIRES (types Prisma natifs ou énumérations déclarées) du modèle ; les relations et les `@@` sont écartés ; None si le modèle est absent."""
    natifs = {"String", "Int", "BigInt", "Float", "Decimal", "Boolean", "DateTime", "Json", "Bytes"}
    enums = set(re.findall(r"^enum (\w+) \{", schema, flags=re.M))
    m = re.search(r"^model " + re.escape(modele) + r" \{\n(.*?)\n\}", schema, flags=re.M | re.S)
    if not m:
        return None
    res = []
    for l in m[1].split("\n"):
        l = l.strip()
        mm = re.match(r"^(\w+)\s+(\w+)(\?|\[\])?\s*(.*)$", l)
        if not mm or l.startswith("@@") or l.startswith("//"):
            continue
        if mm[2] in natifs or mm[2] in enums:
            res.append(mm[1])
    return res


def colonnes_du_modele(schema, modele):
    """Les NOMS DE COLONNE des champs scalaires d'un modèle : le `@map("x")` s'il existe, sinon le nom du champ ; None si le modèle est absent."""
    m = re.search(r"^model " + re.escape(modele) + r" \{\n(.*?)\n\}", schema, flags=re.M | re.S)
    if not m:
        return None
    champs = champs_scalaires_modele(schema, modele)
    res = []
    for l in m[1].split("\n"):
        mm = re.match(r"^\s*(\w+)\s", l)
        if mm and mm[1] in champs:
            mp = re.search(r'@map\("([^"]+)"\)', l)
            res.append(mp[1] if mp else mm[1])
    return res


def cles_objet_zod(texte, nom):
    """Les clés de `export const NOM = z.object({ … })` (niveau 1, début de ligne indenté de 4 espaces) ; None si absent."""
    m = re.search(r"export const " + re.escape(nom) + r" = z\s*\.object\(\{\n(.*?)\n  \}\)", texte, flags=re.S)
    return None if not m else re.findall(r"^    (\w+):", m[1], flags=re.M)


def listes_ma_salle(texte, scenario):
    """{libellé: valeur} des lectures « SANS rechargement » / « APRÈS rechargement » d'un scénario S<n>, valeur = la liste JSON qui suit « : » (la dernière de la ligne)."""
    res = {}
    for m in re.finditer(r"^MESURE " + scenario + r" · (.*)$", texte, flags=re.M):
        ligne = m[1]
        for lib in ("SANS rechargement", "APRÈS rechargement"):
            mm = re.search(lib + r"[^\[]*?(\[.*?\])(?: · |$)", ligne)
            if mm:
                try:
                    res[lib] = json.loads(mm[1])
                except json.JSONDecodeError:
                    res[lib] = mm[1]
    return res


def statut_http(texte, etiquette):
    m = re.search(r"^MESURE statut " + re.escape(etiquette) + r"(?: \([^)]*\))? \(.*?→ HTTP (\d+)", texte, flags=re.M)
    return None if not m else int(m[1])


def prefixe_uuid(u):
    return u[:8]


def fenetres_par_jour(ms_debut, ms_fenetre=65536, ms_jour=86_400_000):
    """Nombre de fenêtres de `ms_fenetre` ms (alignées sur l'époque) que recoupe l'intervalle [ms_debut, ms_debut + ms_jour)."""
    return (ms_debut + ms_jour - 1) // ms_fenetre - ms_debut // ms_fenetre + 1


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


def melange_fins_de_ligne(octets):
    crlf = octets.count(b"\r\n")
    return crlf, octets.count(b"\n") - crlf


def dernier_numero_rang(texte):
    """Le numéro N de la DERNIÈRE occurrence de « RANG N : EN ATTENTE D'ARBITRAGE DE KO » (gras ou non) ; None si aucune."""
    trouves = re.findall(r"RANG (\d+) : EN ATTENTE D'ARBITRAGE DE KO", texte)
    return None if not trouves else int(trouves[-1])


def lignes_registre(texte):
    """Les identifiants « Dnnn » des lignes `| Dnnn | … |` du tableau du registre, dans l'ordre du fichier."""
    return re.findall(r"^\| (D\d+) \|", texte, flags=re.M)


# ══ CALIBRATION — deux bras par extracteur ; abandon si un seul manque ═════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("bilan négatif (la forme « écart(s) » de la sortie n'est pas celle du texte)", bilan_texte("BILAN : 139 contrôles · 4 écart(s) de D326 [x]"), None)
bras("bilan texte positif", bilan_texte("**139 contrôles · 4 écarts de D326 · 0 écart de l'état reçu · 8 constats · 5 non vérifiables**"), (139, 4, 0, 8, 5))
bras("bilan texte négatif", bilan_texte("rien"), None)
bras("ventilation positive", ventilation("   ventilation par famille : A 4 · C 21 · X 6  (somme 31)"), ({"A": 4, "C": 21, "X": 6}, 31))
bras("ventilation négative", ventilation("rien"), None)
tt = "== x\n✓ P1 a\n✗ P2 b\n   ✓ cal\n· C1 CONSTAT\n? N1 NON\n✓ P3 c\n"
bras("tally positif", tally_sortie(tt), (2, 1, 1, 1, 1))
bras("tally négatif (texte vide)", tally_sortie(""), (0, 0, 0, 0, 0))
bras("liste d'une constante positif", liste_constante_ts("export const QUOTE_OPEN_STATUSES = [QuoteStatus.DRAFT, QuoteStatus.SENT] as const;", "QUOTE_OPEN_STATUSES"), ["DRAFT", "SENT"])
bras("liste d'une constante négatif", liste_constante_ts("export const AUTRE = [QuoteStatus.DRAFT] as const;", "QUOTE_OPEN_STATUSES"), None)
bras("écriture de ACCEPTED positif", ecrit_accepte("      nouveauStatut: QuoteStatus.ACCEPTED,"), True)
bras("écriture de ACCEPTED négatif (une comparaison)", ecrit_accepte("  return isQuoteOpen(status) || status === QuoteStatus.ACCEPTED;"), False)
bras("lignes de positif", lignes_de("a\nb\nc\nd", 2, 3), "b\nc")
bras("lignes de négatif (hors borne)", lignes_de("a\nb", 5, 6), "")
bras("décorateurs de route positif (trois, indentés)", decorateurs_routes("  @Get(':id')\n@Post()\n    @Delete('x')\n"), 3)
bras("décorateurs de route négatif (un commentaire, un @Controller)", decorateurs_routes("// @Get('a')\n@Controller('x')\n  @UseGuards(G)\n"), 0)
sch = "enum QuoteStatus {\n  DRAFT\n}\nmodel Quote {\n  id String @id\n  status QuoteStatus\n  venue Venue @relation(fields: [venueId], references: [id])\n  venueId String\n  note String?\n  @@index([venueId])\n}\n"
bras("champs scalaires positif (relation et @@ écartés)", champs_scalaires_modele(sch, "Quote"), ["id", "status", "venueId", "note"])
bras("champs scalaires négatif (modèle absent)", champs_scalaires_modele(sch, "Autre"), None)
mm = 'MESURE S4 · avant : ["A"] · après l\'édition (PATCH 200), SANS rechargement : ["A"]\nMESURE S4 · APRÈS rechargement : ["B"]\n'
sch2 = sch.replace("note String?", 'note String? @map("note_x")')
bras("colonnes du modèle positif (@map respecté)", colonnes_du_modele(sch2, "Quote"), ["id", "status", "venueId", "note_x"])
bras("colonnes du modèle négatif (modèle absent)", colonnes_du_modele(sch2, "Autre"), None)
bras("clés d'un objet Zod positif (commentaire à 4 espaces écarté)", cles_objet_zod("export const q = z\n  .object({\n    a: z.string(),\n    /** doc */\n    b: z.number()\n  })\n", "q"), ["a", "b"])
bras("clés d'un objet Zod négatif", cles_objet_zod("rien", "q"), None)
bras("listes « Ma salle » positif", listes_ma_salle(mm, "S4"), {"SANS rechargement": ["A"], "APRÈS rechargement": ["B"]})
bras("listes « Ma salle » négatif (scénario absent)", listes_ma_salle(mm, "S9"), {})
ms = "MESURE statut ACCEPTED (lu en base : ACCEPTED ; posé par SQL) → HTTP 200 · x\nMESURE statut SENT (hérité) (lu en base : SENT) → HTTP 200 · x\nMESURE statut CANCELLED (lu) → HTTP 409 · x\n"
bras("statut HTTP positif (un 200)", statut_http(ms, "ACCEPTED"), 200)
bras("statut HTTP positif (étiquette suivie de « (hérité) »)", statut_http(ms, "SENT"), 200)
bras("statut HTTP négatif (étiquette absente)", statut_http(ms, "DECLINED"), None)
bras("préfixe d'un UUID", prefixe_uuid("01a11ec3-2a2d-7162-9e2e-42f88a8f0df1"), "01a11ec3")
# 86 400 000 ms / 65 536 ms = 1318,36… : un jour recoupe 1319 fenêtres s'il commence tôt dans la sienne, 1320 s'il commence tard — deux bras CONNUS, dérivés à la main
bras("fenêtres par jour, bras bas (début aligné sur une fenêtre)", fenetres_par_jour(0), 1319)
bras("fenêtres par jour, bras haut (début tard dans une fenêtre : 65 000 ms)", fenetres_par_jour(65_000), 1320)
bras("png positif (24×7)", png_dims(png_fabrique(24, 7)), (24, 7))
bras("png négatif", png_dims(b"GIF89a" + b"\x00" * 30), None)
corps_ok = b"corps\n"
sc_ok = corps_ok + ("== SCEAU sha256:{} — neutralisation/audit-secrets.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==\n").format(hashlib.sha256(corps_ok).hexdigest()).encode("utf-8")
bras("sceau positif", sceau_valide(sc_ok), True)
bras("sceau négatif (un octet changé)", sceau_valide(sc_ok.replace(b"corps", b"corpS")), False)
bras("fins de ligne : CRLF pur", melange_fins_de_ligne(b"a\r\nb\r\n"), (2, 0))
bras("fins de ligne : un LF nu repéré", melange_fins_de_ligne(b"a\r\nb\n"), (1, 1))
bras("dernier rang en attente positif (gras, puis plus bas)", dernier_numero_rang("⇒ **RANG 34 : EN ATTENTE D'ARBITRAGE DE KO** puis ⇒ RANG 35 : EN ATTENTE D'ARBITRAGE DE KO"), 35)
bras("dernier rang en attente négatif", dernier_numero_rang("rien"), None)
bras("registre positif", lignes_registre("| D1 | x |\n| D2 | A | y |\ntexte | D9 | z\n"), ["D1", "D2"])
bras("registre négatif", lignes_registre("rien"), [])
if not all(cal):
    sys.exit(f"CALIBRATION : {cal.count(False)} bras manqué(s) — l'instrument ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

# ══ Les textes lus, une fois ══════════════════════════════════════════════════════════════════════════════════════════
CONT = show(FIN, "ZWADJ_CONTINUITE.md")
CONT_DEBUT = show(DEBUT, "ZWADJ_CONTINUITE.md")
AGENTS = show(FIN, "AGENTS.md")
BACKLOG = show(FIN, "ZWADJ_BACKLOG.md")
SEC = re.search(r"## Session des 08 et 09/10/2026 — D327 .*?(?=\n## Session du 05/10/2026 — D326)", CONT, flags=re.S)
BLOC = re.search(r"### ⛔ CLÔTURE DU 09/10/2026 \(D327\).*?(?=\n## ~~PROCHAIN LOT~~ — rang 33)", CONT, flags=re.S)
ORDRE = re.search(r"\n## ORDRE DES RANGS.*?(?=\n## )", CONT, flags=re.S)
if not SEC or not BLOC or not ORDRE:
    sys.exit("la section D327, son bloc de clôture ou l'ordre des rangs est introuvable : l'instrument ne juge pas")
SECT, CLOT, ORD = aplati(SEC[0]), aplati(BLOC[0]), aplati(ORDRE[0])
print(f"== texte lu à {FIN} : section D327 {len(SECT)} caractères · bloc de clôture {len(CLOT)} · ordre des rangs {len(ORD)} (aplatis)\n")

# ══ X — l'état LIVE à l'ouverture de D328 ═════════════════════════════════════════════════════════════════════════════
print("== X — état live (D328)")
git("fetch", check=False)
ctl("X1", "branche courante", "main", git("branch", "--show-current").decode().strip())
ctl("X2", "`origin/main` après `git fetch` = la clôture de D327", git("rev-parse", FIN).decode().strip(), git("rev-parse", "origin/main").decode().strip())
ctl("X3", "`git status --porcelain` hors `docs/preuves/D328/` (les fichiers de CE lot) : vide", [], [l for l in git("status", "--porcelain").decode().split("\n") if l.strip() and "docs/preuves/D328" not in l])
ctl("X4", "aucun stash", [], [l for l in git("stash", "list").decode().split("\n") if l.strip()])
ctl("X5", "le commit de la table d'ouverture ne contient QUE `docs/preuves/D328/table-ouverture.md`", ["docs/preuves/D328/table-ouverture.md"], [l for l in git("show", "--name-only", "--format=", TABLE).decode().split("\n") if l.strip()])
ctl("X6", "le parent de la table d'ouverture est la clôture de D327", git("rev-parse", FIN).decode().strip(), git("rev-parse", f"{TABLE}^").decode().strip())

# ══ P — provenance de D327 ════════════════════════════════════════════════════════════════════════════════════════════
print("\n== P — provenance : les commits de D327 et ce que chacun touche")
revs = git("rev-list", "--reverse", f"{DEBUT}..{FIN}").decode().split()
ctl("P1", "commits entre la clôture de D326 et celle de D327 (ordre chronologique : les pièces, puis la clôture)", [git("rev-parse", PIECES).decode().strip(), git("rev-parse", FIN).decode().strip()], revs)
ctl("P2", "chaîne : le parent du commit des pièces est la clôture de D326", git("rev-parse", DEBUT).decode().strip(), git("rev-parse", f"{PIECES}^").decode().strip())
ctl("P3", "chaîne : le parent de la clôture de D327 est le commit des pièces", git("rev-parse", PIECES).decode().strip(), git("rev-parse", f"{FIN}^").decode().strip())
noms = noms_diff(DEBUT, FIN)
hors = [n for n in noms if n not in AUTORITES and not n.startswith(PD + "/")]
ctl("P4", f"fichiers du diff ({len(noms)}) hors les trois `.md` et hors `{PD}/` : aucun", [], hors)
ns = noms_diff(DEBUT, FIN, statut=True)
modifies = sorted(l.split("\t")[1] for l in ns if l[0] == "M")
supprimes = [l for l in ns if l[0] == "D"]
ajoutes = [l for l in ns if l[0] == "A"]
ctl("P5", f"statuts du diff ({len(ns)} lignes parcourues) : les fichiers MODIFIÉS sont exactement les trois `.md`", sorted(AUTORITES), modifies)
ctl("P6", "aucune suppression", [], supprimes)
ctl("P7", f"tout le reste est AJOUTÉ ({len(ajoutes)} fichiers) : D327 n'a retouché aucune pièce d'une autre décision", len(ns) - 3, len(ajoutes))
ctl("P8", "le commit des pièces ne touche AUCUN fichier d'autorité", [], [n for n in git("show", "--name-only", "--format=", PIECES).decode().split("\n") if n.strip() in AUTORITES])
ctl("P9", "le commit de clôture ne touche QUE les trois `.md`", sorted(AUTORITES), sorted(n for n in git("show", "--name-only", "--format=", FIN).decode().split("\n") if n.strip()))
ctl("P10", "aucun fichier de `apps/`, `packages/`, `e2e/`, `neutralisation/`, `docs/` hors preuves, ni migration, dans le diff", [], [n for n in noms if re.match(r"^(apps|packages|e2e|neutralisation)/", n) or "migration" in n or (n.startswith("docs/") and not n.startswith(PD + "/"))])
ctl("P11", "aucune pièce de D326 touchée", [], [n for n in noms if n.startswith("docs/preuves/D326/")])
sortie_chemin = f"{PD}/lecture-adverse/confronter-sortie.txt"
ctl("P12", "la sortie de la lecture adverse de D327 est dans le commit des pièces (avant toute écriture d'autorité)", (False, True), (existe(DEBUT, sortie_chemin), existe(PIECES, sortie_chemin)))
ctl("P13", "`balayage.py` de D327 est la copie à l'octet de celui de D326 (même objet git)", blob(DEBUT, "docs/preuves/D326/passe-d277/balayage.py"), blob(FIN, f"{PD}/passe-d277/balayage.py"))
motifs = [l for l in show(FIN, f"{PD}/passe-d277/motifs.txt").split("\n") if l.strip() and not l.startswith("#")]
mm_ = re.search(r"motifs \*\*lus dans `motifs\.txt`\*\* \((\d+), dont (\d+) de calibration\)", SECT)
ctl("P14", f"motifs de la passe D277 ({len(motifs)} lignes parcourues) : le nombre écrit par D327", int(mm_[1]) if mm_ else None, len(motifs))
ctl("P15", "dont les motifs de calibration (`T+`, `T-`) : le nombre écrit par D327", int(mm_[2]) if mm_ else None, sum(1 for l in motifs if l.startswith(("T+", "T-"))))
for nom, att in (("balayage-1-AVANT-ECRITURE", 171), ("balayage-apres-ecriture", 240), ("balayage-final", 264)):
    t = piece(f"passe-d277/{nom}.txt")
    m = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+)", t)
    ctl("P16" + "abc"[("balayage-1-AVANT-ECRITURE", "balayage-apres-ecriture", "balayage-final").index(nom)], f"{nom}.txt : « OCCURRENCES DANS L'ARBRE » (le chiffre écrit par D327 : {att})", att, int(m[1]) if m else None)
tz = piece("passe-d277/balayage-final.txt")
m = re.search(r"MOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", tz)
ctl("P17", "balayage final : motifs à zéro (D327 : 0)", 0, int(m[1]) if m else None)
# fins de ligne des trois .md : l'arbre de travail (autocrlf normalise les objets en LF)
for f in AUTORITES:
    with open(f, "rb") as fh:
        crlf, lf = melange_fins_de_ligne(fh.read())
    ctl("P18" + "abc"[AUTORITES.index(f)], f"{f} (arbre : {crlf} CRLF parcourues) : aucun LF nu", 0, lf)
# la table des fichiers de D327 : chemins complets ?
tab = re.search(r"#### Fichiers attendus.*?\n(.*?)\n⚠ \*\*Aucun fichier hors", BLOC[0], flags=re.S)
rangees = re.findall(r"^\| (.+?) \| .*\|$", tab[1], flags=re.M) if tab else []
rangees = [r for r in rangees if r not in ("fichier", "---|---")]
ctl("P19", f"la table des fichiers de D327 compte {len(rangees)} lignes parcourues : quatre, dont une par PRÉFIXE (`tout chemin commençant par`)", (4, 1), (len(rangees), sum(1 for r in rangees if "tout chemin commençant par" in r)))
constat("P-C1", f"la table de D327 nomme les trois `.md` et UN PRÉFIXE ({PD}/) : les {len(ajoutes)} fichiers ajoutés ne sont donc comparables à aucune ligne — « 0 non déclaré » est vrai par construction, pour tout fichier qui commence par ce préfixe. D327 l'écrit lui-même (faute n° 1 : la table est écrite à la clôture, depuis le diff). C'est la raison de la règle acceptée par Ko le 11/10/2026 (chemins complets, table commitée seule en premier).")

# ══ C — les comptes de la lecture adverse de D327, confrontés à sa sortie ═════════════════════════════════════════════
print("\n== C — les comptes que D327 écrit sur sa propre lecture adverse")
sortie = piece("lecture-adverse/confronter-sortie.txt")
passe1 = piece("lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt")
defauts = piece("lecture-adverse/defauts-instrument.txt")
ok_, ko_, cal_, con_, nv_ = tally_sortie(sortie)
b = bilan_texte(SECT)
ctl("C1", "bilan écrit par D327 (contrôles · écarts · état reçu · constats · non vérifiables) = les lignes de sa sortie", b, (ok_ + ko_, ko_, 0, con_, nv_))
vent = ventilation(sortie)
txt_v = re.search(r"ventilation : ((?:[A-Z] \d+ · )*[A-Z] \d+) \(somme (\d+) ; \*\*aucune famille à zéro\*\*\)", SECT)
vtxt = None if not txt_v else ({k: int(v) for k, v in re.findall(r"([A-Z]) (\d+)", txt_v[1])}, int(txt_v[2]))
ctl("C2", "ventilation par famille écrite dans la section = celle de la sortie", vtxt, vent)
ctl("C3", "somme de la ventilation = nombre de contrôles", ok_ + ko_, sum(vent[0].values()) if vent else None)
ctl("C4", "tous les ✗ de la sortie sont ceux que D327 nomme (P8a, G1, T4, Q3j)", ["P8a", "G1", "T4", "Q3j"], [re.match(r"✗ (\S+)", l)[1] for l in sortie.split("\n") if l.startswith("✗ ")])
cb = re.search(r"calibration : (\d+) bras", SECT)
ctl("C5", "bras de calibration écrits par D327 = lignes `   ✓` de la sortie", int(cb[1]) if cb else None, cal_)
nl = re.search(r"\((\d+) lignes\)", SECT)
ctl("C6", "« (236 lignes) » : le nombre de lignes de la sortie", int(nl[1]) if nl else None, len(show(FIN, sortie_chemin).split("\n")) - 1)
p1 = re.search(r"(\d+) ✗ dont (\d+) faux", SECT) or re.search(r"avec ses (\d+) ✗ dont (\d+) faux", SECT)
ctl("C7", "première passe : ✗ de la pièce versée = « 11 ✗ »", int(p1[1]) if p1 else None, len(re.findall(r"^✗ ", passe1, flags=re.M)))
nd = len(re.findall(r"^\d+\. ", defauts, flags=re.M))
ctl("C8", "défauts de l'instrument listés dans la pièce (écrits « DIX » par D327)", 10, nd)
nb = re.search(r"\((\d+) ✗ de D326 annoncés, dont (\d+) faux", defauts)
ctl("C9", "la pièce des défauts dit « 11 ✗ … dont 9 faux » comme la section", (int(p1[1]), int(p1[2])) if p1 else None, (int(nb[1]), int(nb[2])) if nb else None)
for nom, label in (("a", "d327a"), ("b", "d327b")):
    oc = show_octets(FIN, f"{PD}/audit-secrets-{label}.txt")
    ctl("C10" + nom, f"sceau de audit-secrets-{label}.txt recalculé", True, sceau_valide(oc))
oc_a = show_octets(FIN, f"{PD}/audit-secrets-d327a.txt")
ctl("C11", "taille de audit-secrets-d327a.txt = « 143 534 octets » écrits", 143534, len(oc_a))
ta = piece("tri-audit-d327a.txt")
m_ta = re.search(r"alertes ABSENTES de la précédente : (\d+)", ta)
ctl("C12", "tri de l'audit : « 8 alertes ABSENTES de la précédente » (D327) — la pièce dit 8", 8, int(m_ta[1]) if m_ta else None)
non_verifiable("C-N1", "que le dernier audit de secrets (`d327b`) ait couvert les octets FINAUX des trois `.md` : les deux commits partent après lui, mais `git` ne dit ni quand il a été lancé ni quand le texte final a été tapé (même limite que A-N1 de la lecture adverse de D327).")
non_verifiable("C-N2", "les 8 « alertes triées au contexte » : la pièce `tri-audit-d327a.txt` renvoie aux lignes de la sortie scellée, elle ne recopie aucun contexte (c'est voulu, D299) ; que la session les ait LUES ne se vérifie pas.")

# ══ R — registre, ordre des rangs, chaîne du compteur ═════════════════════════════════════════════════════════════════
print("\n== R — registre, ordre des rangs, compteur")
reg = lignes_registre(CONT)
ctl("R1", f"dernière ligne du registre ({len(reg)} lignes parcourues) = D327, précédée de D326", ("D326", "D327"), (reg[-2], reg[-1]))
occ0 = [show(DEBUT, f).count("D327") for f in ("ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md", "CLAUDE.md")]
ctl("R2", "« D327 » avant le lot dans les quatre fichiers d'autorité (D327 écrit 0, 0, 0, 0)", [0, 0, 0, 0], occ0)
ctl("R3", "dernière ligne « RANG N : EN ATTENTE D'ARBITRAGE DE KO » de l'ordre des rangs", 35, dernier_numero_rang(ORDRE[0]))
ctl("R4", "titre du point d'entrée du rang 34 : barré et « COMPTEUR DEUX, INCHANGÉ »", (True, True), ("~~PROCHAIN LOT~~ — rang 34" in CONT, "COMPTEUR DEUX, INCHANGÉ" in BLOC[0].split("\n")[0] or "COMPTEUR DEUX, INCHANGÉ" in CONT.split("## ~~PROCHAIN LOT~~ — rang 34")[1].split("\n")[0]))
ctl("R5", "`AGENTS.md` porte la clôture du rang 34 et « RANG 35 : EN ATTENTE »", (True, True), ("rang 34 CLOS — lot DOCUMENTAIRE" in AGENTS, "RANG 35 : EN ATTENTE D'ARBITRAGE DE KO" in AGENTS))
ctl("R6", "le backlog porte « Reports du 09/10/2026 — rang 34 »", True, "Reports du 09/10/2026 — rang 34" in BACKLOG)
ctl("R7", "le compteur écrit au bloc de clôture de D327 : DEUX (rangs 32 et 33)", True, "le compteur de lots de code non certifiés reste DEUX** (rangs 32 et 33" in BLOC[0])
ctl("R8", "la condition de clôture du rang 33 est écrite OUVERTE au bloc de clôture du rang 34", True, "LA CONDITION DE CLÔTURE DU RANG 33 N'EST PAS LEVÉE" in CLOT)
ctl("R9", "la question due à Ko (un correctif avant ADM-1 ferait d'ADM-2 un troisième lot) est dans l'ordre des rangs", True, "ferait d'ADM-2 un TROISIÈME lot de code non certifié" in ORD)
r327 = [l for l in CONT.split("\n") if l.startswith("| D327 |")][0]
ctl("R10", "la ligne de registre de D327 écrit les mêmes comptes que la section (139 contrôles · 4 écarts · 8 constats · 5 non vérifiables)", True, all(x in aplati(r327) for x in ("139 contrôles", "4 écarts", "8 constats", "5 non vérifiables")))
non_verifiable("R-N1", "que les textes de Ko (08/10/2026) soient reproduits MOT POUR MOT : ils n'existent que dans le chat ; le fichier ne peut être confronté qu'à lui-même (ordre des rangs et bloc D327 de la méthode renforcée portent les mêmes quatre décisions du relecteur).")
d1 = "Le rang reste clos sur le code : le compteur reste à DEUX."
ctl("R11", "les quatre décisions du relecteur : une phrase-témoin présente à l'identique dans l'ordre des rangs ET dans le bloc de la méthode renforcée (≥ 2 occurrences)", True, aplati(CONT).count(d1) >= 2)

# ══ Q — le code et les pièces cités par D327 ══════════════════════════════════════════════════════════════════════════
print("\n== Q — ce que D327 cite du code (à la ligne) et de ses pièces")
QD = show(FIN, "apps/api/src/documents/quote-document.ts")
ctl("Q1", "`quoteReference` (quote-document.ts:52-54) = `id.slice(0, 8)` + `-v` + version", True, "slice(0, 8)" in lignes_de(QD, 52, 54) and "-v" in lignes_de(QD, 52, 54))
ctl("Q2", "la référence est imprimée à `:77` (balise title) et `:84` (sous-titre)", (True, True), ("quoteReference" in lignes_de(QD, 77, 77), "quoteReference" in lignes_de(QD, 84, 84) or "reference" in lignes_de(QD, 84, 84).lower()))
QT = show(FIN, "packages/types/src/quote.ts")
ctl("Q3", "`quoteDocumentFilename` (quote.ts:287-289) : `devis-<date>-v<version>-<8 caractères de l'id>.pdf`", True, "quoteDocumentFilename" in lignes_de(QT, 285, 289) and "slice(0, 8)" in lignes_de(QT, 285, 291))
ctl("Q4", "appelée par quote-document.service.ts:63", True, "quoteDocumentFilename" in lignes_de(show(FIN, "apps/api/src/documents/quote-document.service.ts"), 63, 63))
ctl("Q5", "appelée par walkin-journey.tsx:495", True, "quoteDocumentFilename" in lignes_de(show(FIN, "apps/pro/src/dashboard/walkin-journey.tsx"), 495, 495))
ctl("Q6", "testée : quote-document.spec.ts:111 « 01a10f0a-v2 »", True, "01a10f0a-v2" in lignes_de(show(FIN, "apps/api/src/documents/quote-document.spec.ts"), 111, 111))
ctl("Q7", "testée : quote-document.service.spec.ts:98", True, "quoteDocumentFilename" in lignes_de(show(FIN, "apps/api/src/documents/quote-document.service.spec.ts"), 96, 100) or "devis-" in lignes_de(show(FIN, "apps/api/src/documents/quote-document.service.spec.ts"), 96, 100))
ctl("Q8", "testée : quote-document.int-spec.ts:113 et walkin-journey.test.tsx:1313", (True, True), ("devis-" in lignes_de(show(FIN, "apps/api/test/int/quote-document.int-spec.ts"), 111, 115) or "quoteDocumentFilename" in lignes_de(show(FIN, "apps/api/test/int/quote-document.int-spec.ts"), 111, 115), "devis-" in lignes_de(show(FIN, "apps/pro/src/dashboard/walkin-journey.test.tsx"), 1311, 1315) or "quoteDocumentFilename" in lignes_de(show(FIN, "apps/pro/src/dashboard/walkin-journey.test.tsx"), 1311, 1315)))
E2 = show(FIN, "e2e/specs/r33-remise-devis.e2e.ts")
ctl("Q9", "e2e r33 : `NOM_DE_FICHIER` aux lignes 65, 80, 81", True, all("NOM_DE_FICHIER" in lignes_de(E2, n, n) for n in (65, 80, 81)))
NR = show(FIN, "neutralisation/neutralize-r33.py")
ctl("Q10", "`neutralize-r33.py` : M-11 (177), SV-8 (231), T-3 (240), J-13 (290)", (True, True, True, True), tuple(k in lignes_de(NR, n - 2, n + 2) for k, n in (("M-11", 177), ("SV-8", 231), ("T-3", 240), ("J-13", 290))))
FR, AR = show(FIN, "packages/i18n/messages/fr.json"), show(FIN, "packages/i18n/messages/ar.json")
ctl("Q11", "`quote.document.reference` aux lignes 520 des deux catalogues (clé « reference » du bloc « document »)", (True, True), ('"reference"' in lignes_de(FR, 520, 520), '"reference"' in lignes_de(AR, 520, 520)))
QS = show(FIN, "apps/api/src/venues/quote-store.prisma.ts")
ctl("Q12", "`creerTeteDeChaine` : lignes 65-78 (début à la ligne 65 ou 64)", True, "creerTeteDeChaine" in lignes_de(QS, 64, 66))
ctl("Q13", "`creerRevision` : lignes 80-100 (début à la ligne 80 ou 79)", True, "creerRevision" in lignes_de(QS, 79, 81))
ctl("Q14", "`verrouillerChaine` : lignes 36-38, un `FOR UPDATE`", True, "FOR UPDATE" in lignes_de(QS, 34, 40))
ctl("Q15", "booking-locks.prisma.ts:76 verrouille `venues` `FOR UPDATE`", True, "FOR UPDATE" in lignes_de(show(FIN, "apps/api/src/venues/booking-locks.prisma.ts"), 74, 78) and "venues" in lignes_de(show(FIN, "apps/api/src/venues/booking-locks.prisma.ts"), 74, 78))
ctl("Q16", "availability-blocks.service.ts:116 verrouille la salle `FOR UPDATE`", True, "FOR UPDATE" in lignes_de(show(FIN, "apps/api/src/venues/availability-blocks.service.ts"), 114, 118))
ctl("Q17", "venue-store.prisma.ts:81 : clé de tri `updatedAt`", True, "updatedAt" in lignes_de(show(FIN, "apps/api/src/venues/venue-store.prisma.ts"), 79, 83))
ctl("Q18", "quotes-section.tsx:180 : « version N »", True, "version" in lignes_de(show(FIN, "apps/pro/src/venues/quotes-section.tsx"), 178, 182).lower())
ctl("Q19", "`QUOTE_OPEN_STATUSES` = [DRAFT, SENT]", ["DRAFT", "SENT"], liste_constante_ts(QT, "QUOTE_OPEN_STATUSES"))
ctl("Q20", "`QUOTE_LOST_STATUSES` = [CANCELLED, DECLINED]", ["CANCELLED", "DECLINED"], liste_constante_ts(QT, "QUOTE_LOST_STATUSES"))
# 122 fichiers de production de l'API, 0 écriture d'un statut ACCEPTED de devis
fichiers = [n for n in git("ls-tree", "-r", "--name-only", FIN, "apps/api/src").decode().split("\n") if n.endswith(".ts") and not re.search(r"\.(spec|int-spec)\.ts$", n)]
ecritures = [n for n in fichiers if any(ecrit_accepte(l) for l in show(FIN, n).split("\n"))]
ctl("Q21", f"fichiers de production de l'API parcourus ({len(fichiers)}) : D327 écrit « 122 »", 122, len(fichiers))
ctl("Q22", "dont écrivant un statut ACCEPTED de devis : aucun (D327 : 0)", [], ecritures)
controleurs = [n for n in git("ls-tree", "-r", "--name-only", FIN, "apps/api/src").decode().split("\n") if n.endswith(".controller.ts")]
nroutes = sum(decorateurs_routes(show(FIN, n)) for n in controleurs)
ctl("Q23", f"contrôleurs parcourus ({len(controleurs)}) : 23", 23, len(controleurs))
ctl("Q24", "routes (décorateurs `@Get/@Post/@Put/@Patch/@Delete`) : D327 écrit « 79 routes d'API »", 79, nroutes)
SCH = show(FIN, "apps/api/prisma/schema.prisma")
cq = champs_scalaires_modele(SCH, "Quote")
ctl("Q25", f"colonnes scalaires du modèle `Quote` ({cq and len(cq)} lues) : la pièce `colonnes-quotes.json` en liste 19", len(json.loads(piece("releve/pdf/sortie/colonnes-quotes.json"))), len(cq or []))
ctl("Q26", "les NOMS des 19 colonnes lues dans la base = les colonnes que le schéma déclare pour `Quote` (champ ou `@map`), comme ENSEMBLES", sorted(c["column_name"] for c in json.loads(piece("releve/pdf/sortie/colonnes-quotes.json"))), sorted(colonnes_du_modele(SCH, "Quote") or []))
mig = [n for n in git("ls-tree", "-r", "--name-only", FIN, "apps/api/prisma/migrations").decode().split("\n") if n.endswith("migration.sql")]
uniques_users = sorted(set(re.findall(r'CREATE UNIQUE INDEX "(users_\w+)"', "\n".join(show(FIN, n) for n in mig))))
ctl("Q27", f"index uniques de `users` créés par les migrations ({len(mig)} fichiers parcourus) : D327 écrit email, google_sub (+ la clé primaire) — aucun sur `phone`", True, "users_phone_key" not in uniques_users and "users_email_key" in uniques_users)
print(f"   (index uniques `users_*` relevés : {uniques_users})")
ctl("Q28", "le schéma : `User.phone` sans `@unique`", False, bool(re.search(r"^\s+phone\s+String\??\s+.*@unique", re.search(r"^model User \{.*?^\}", SCH, flags=re.M | re.S)[0], flags=re.M)))
BK = re.search(r"^model Booking \{.*?^\}", SCH, flags=re.M | re.S)[0]
ctl("Q51", "schéma : `Booking.contactFirstName/LastName/Phone` obligatoires, `contactEmail` facultatif (D327 : NOT NULL × 3, e-mail nullable)", (False, False, False, True), tuple("?" in re.search(r"^\s+" + c + r"\s+String(\??)\s", BK, flags=re.M)[0] for c in ("contactFirstName", "contactLastName", "contactPhone", "contactEmail")))
US = re.search(r"^model User \{.*?^\}", SCH, flags=re.M | re.S)[0]
ctl("Q52", "schéma : `User.firstName`, `lastName`, `phone` facultatifs (D327 : nullables)", (True, True, True), tuple(bool(re.search(r"^\s+" + c + r"\s+String\?", US, flags=re.M)) for c in ("firstName", "lastName", "phone")))
VN = re.search(r"^model Venue \{.*?^\}", SCH, flags=re.M | re.S)[0]
ctl("Q53", "schéma : `Venue.nameFr` et `nameAr` obligatoires (D327 : NOT NULL × 2)", (True, True), tuple(bool(re.search(r"^\s+" + c + r"\s+String\s", VN, flags=re.M)) for c in ("nameFr", "nameAr")))
ctl("Q54", "schéma : `VisitBooking.contactPhone` facultatif (D327 relève `visit_bookings.contact_phone`)", True, bool(re.search(r"^\s+contactPhone\s+String\?", re.search(r"^model VisitBooking \{.*?^\}", SCH, flags=re.M | re.S)[0], flags=re.M)))
ctl("Q55", "contrat de création d'un devis : AUCUNE clé de contact (nom, téléphone, e-mail) — seulement `clientId` facultatif (D327 : « aucun champ de contact »)", (["eventDate", "slotTemplateId", "guests", "services", "clientId"], []), (cles_objet_zod(QT, "quoteCreateSchema"), [k for k in (cles_objet_zod(QT, "quoteCreateSchema") or []) if k.lower().startswith("contact")]))
ctl("Q56", "contrat de conversion : le contact entre ICI (prénom, nom, mobile, e-mail) — D327 : « le seul endroit où le nom entre dans la base est `convert` »", ["contactFirstName", "contactLastName", "contactPhone", "contactEmail"], [k for k in (cles_objet_zod(QT, "quoteConvertSchema") or []) if k.startswith("contact")])
# les statuts HTTP de la route du produit
mp =piece("releve/pdf/mesures-pdf.txt")
for etiq, att in (("DRAFT", 200), ("SENT", 200), ("ACCEPTED", 200), ("CANCELLED", 409), ("DECLINED", 409), ("SUPERSEDED", 409)):
    ctl("Q29" + etiq[0] + etiq[1].lower(), f"route du PDF, devis {etiq} : statut HTTP de la pièce (D327)", att, statut_http(mp, etiq))
ctl("Q30", "ancienne version d'une chaîne : 409 `QUOTE_VERSION_NOT_ACTIVE` avec `latestVersion: 2`", True, "QUOTE_VERSION_NOT_ACTIVE" in mp and re.search(r"latestVersion\W+2", mp) is not None)
# les montants du relevé 1
ap = piece("releve/pdf/analyse-pdf.txt")
for cle, attendu in (("devis A · fr", "Location 180000 · Prestations 0 · Total 180000 · Acompte 54000"), ("devis B · fr", "Location 180000 · Prestations 75000 · Total 255000 · Acompte 76500"), ("devis C · fr", "Location 180000 · Prestations 411000 · Total 591000 · Acompte 177300")):
    ctl("Q31" + cle[6], f"{cle} : montants imprimés = stockés (la pièce), égaux à ceux du tableau de D327", True, attendu in ap and cle in ap)
ctl("Q32", "« Qté » : x0–x1 = 343–362 (A), 418–437 (B), 366–386 (C) — arrondis de la pièce de D327 (342,9–362,4 · 417,9–437,5 · 365,9–385,5)", (True, True), ("Qté 343–362" in ap and "Qté 418–437" in ap, "Qté 366–385" in ap or "Qté 366–386" in ap))
ctl("Q33", "la référence imprimée est la MÊME pour A, B et C : `01a11ec3-v1` (balise du texte) — trois devis, trois ids, un seul préfixe", ["01a11ec3"] * 3, [prefixe_uuid(v) for k, v in json.loads(piece("releve/pdf/sortie/ids.json")).items() if k in ("A", "B", "C")])
# images
png = [n for n in git("ls-tree", "-r", "--name-only", FIN, PD).decode().split("\n") if n.endswith(".png")]
dims = {n: png_dims(show_octets(FIN, n)) for n in png}
ctl("Q34", f"images PNG de D327 ({len(png)} parcourues) : toutes valides", [], [n for n, d in dims.items() if d is None])
pages = {n: d for n, d in dims.items() if "/pdf/pages/" in n}
ctl("Q35", f"pages rastérisées du relevé 1 ({len(pages)} parcourues) : 952×1348 (D327) — les 7 images", [(952, 1348)] * 7, sorted(pages.values()))
# « Ma salle »
ms_ = piece("releve/ma-salle/mesures-ma-salle.txt")
L = {s: listes_ma_salle(ms_, s) for s in ("S1", "S2", "S3", "S4", "S6", "S7", "S8")}
ctl("Q36", "S1, S2 : la liste SANS rechargement = APRÈS rechargement (D327 : la contient)", (True, True), (L["S1"].get("SANS rechargement") == L["S1"].get("APRÈS rechargement") != None, L["S2"].get("SANS rechargement") == L["S2"].get("APRÈS rechargement") != None))
ctl("Q37", "S4 (édition), S8 (correction) : SANS ≠ APRÈS (D327 : périmée)", (True, True), (L["S4"]["SANS rechargement"] != L["S4"]["APRÈS rechargement"], L["S8"]["SANS rechargement"] != L["S8"]["APRÈS rechargement"]))
ctl("Q38", "S6 (suppression depuis l'assistant) : encore listée SANS rechargement, vide APRÈS", (True, True), (len(L["S6"]["SANS rechargement"]) == 1, L["S6"]["APRÈS rechargement"] == []))
ctl("Q39", "S7 (suppression depuis la liste, témoin) : vide SANS rechargement", [], L["S7"]["SANS rechargement"])
ctl("Q40", "S5 : « En attente de publication par Zwadj » avant ET après la navigation interne, « Publiée » après rechargement", (True, True, True), ("En attente de publication par Zwadj" in ms_.split("MESURE S5 · AVANT")[1].split("\n")[0], "En attente de publication par Zwadj" in ms_.split("MESURE S5 · APRÈS la publication")[1].split("\n")[0], "Publiée" in ms_.split("MESURE S5 · APRÈS rechargement")[1].split("\n")[0]))
# la référence : l'arithmétique de D327
ids = [v for k, v in json.loads(piece("releve/pdf/sortie/ids.json")).items() if k in ("A", "B", "C")]
horodatage_ms = [int(i.replace("-", "")[:12], 16) for i in ids]
ctl("Q41", "un UUIDv7 : les 8 premiers caractères = les 32 bits de poids fort des 48 de l'horodatage ⇒ pas de 2^16 ms = 65 536 ms (A, B, C : même préfixe ⇒ même fenêtre)", (65536, 1), (2 ** 16, len(set(t >> 16 for t in horodatage_ms))))
maxi = max(fenetres_par_jour(j * 86_400_000 + d) for j in range(0, 400) for d in (0,))
maxi_ = max(fenetres_par_jour(d) for d in range(0, 86_400_000, 60_000))
ctl("Q42", "« au plus 1319 références distinctes par jour » (D327) : le maximum de fenêtres de 65 536 ms qu'un jour de 86 400 000 ms recoupe, tous alignements essayés (pas de 60 s)", 1319, max(maxi, maxi_))
print(f"   (jours UTC alignés : {maxi} fenêtres · tous alignements au pas de 60 s : {maxi_} — 86 400 000 / 65 536 = {86_400_000 / 65536:.4f})")
rp = piece("releve/reference/regles-proposees-sortie.txt")
ctl("Q43", "« 15 devis, 13 préfixes distincts » : la pièce du relevé 3", True, "15 devis, 13 préfixes distincts" in rp)
ctl("Q44", "« cinq salles du même pro, toutes `ko` » : la pièce", True, "{'ko': 5}" in rp and "5 salles" in rp)
ctl("Q45", "« 14 chaînes de devis » pour la salle 01a0ff1c : la pièce", True, "14 devis" in rp)
ctl("Q46", "les quatre PDF du relevé 2 (avant/après la conclusion) : mêmes pixels non blancs avant/après (28 842 · 28 712)", True, "28842" in piece("releve/client/lecture-pdf.txt") and "28712" in piece("releve/client/lecture-pdf.txt"))
ir = piece("releve/clients-pro/inventaire-routes.txt")
ctl("Q47", "relevé 5 : « 23 contrôleurs · 79 routes » dans la pièce", True, "23 contrôleurs parcourus · 79 routes" in ir)
mc = piece("releve/clients-pro/mesures-clients-pro.txt")
ctl("Q48", "relevé 5 : « 4 réservations, 0 avec client_id, 2 téléphones distincts, 2 couples (prénom, nom) distincts, 0 compte »", True, '{"n":4,"avec_client":0,"telephones":2,"noms":2}' in mc and '{"n":0}' in mc)
ctl("Q49", "backlog : la première ligne qui nomme `UIP-E` est la 1947 À LA CLÔTURE DE D326 (D327 cite `ZWADJ_BACKLOG.md:1947`)", 1947, ([i + 1 for i, l in enumerate(show(DEBUT, "ZWADJ_BACKLOG.md").split("\n")) if "UIP-E" in l] or [None])[0])
lig_uip = [i + 1 for i, l in enumerate(BACKLOG.split("\n")) if "UIP-E" in l][:3]
print(f"   (lignes de `UIP-E` à {FIN} : {lig_uip} ; à {DEBUT} : {[i + 1 for i, l in enumerate(show(DEBUT, 'ZWADJ_BACKLOG.md').split(chr(10))) if 'UIP-E' in l][:3]})")
# les règles proposées de B, recopiées dans deux endroits
regle = "Référence (application et PDF) : `ko_01_ab_v1`, sans la langue."
ctl("Q50", "les règles proposées de B (non arbitrées) sont recopiées à l'identique dans la section D327 ET dans le backlog", (True, True), (regle in SECT, regle in aplati(BACKLOG)))
constat("Q-C1", "les règles proposées de B (initiales de la salle et du client dans le NOM DE FICHIER) sont RETIRÉES par Ko le 11/10/2026 (« plus d'initiales du client, de la salle ni de code commune : le nom du fichier ne contient aucune donnée personnelle ») : la section D327, le backlog (entrée B) et le contrat de la route les portent encore comme « proposées » — à annoter, ce que fait la passe D277 de ce lot.")
constat("Q-C2", "le relevé 3 de D327 a mesuré les règles proposées sur la base de développement ET le semis seulement (deux jeux, un pro chacun) : « aucune collision entre propriétaires n'y est mesurable » (limite écrite par D327). Les règles arbitrées le 11/10 (numéro de salle par séquence, numéro de devis par compteur) n'ont pas cette limite : l'unicité se garantit en base, pas par un relevé.")
non_verifiable("Q-N1", "que les trois devis A, B, C du relevé 1 aient été créés « à quelques secondes d'écart » sur une base jetable : les ids (UUIDv7) montrent le même préfixe `01a11ec3` ET des horodatages à quelques dizaines de ms ; la base jetable n'existe plus, la création ne se rejoue pas ici.")

# ══ L — l'état VIVANT de la base de développement, SELECT seulement ═══════════════════════════════════════════════════
print("\n== L — base de développement (état vivant, `SELECT` seulement, session en lecture seule)")


def psql(sql):
    r = subprocess.run(
        ["docker", "exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-F", "|", "-c", sql],
        capture_output=True,
    )
    return r.returncode, r.stdout.decode("utf-8", errors="replace").strip(), r.stderr.decode("utf-8", errors="replace").strip()


rc, out, err = psql("SELECT 1")
ctl("L0", "la base de développement répond (calibration : `SELECT 1`)", (0, "1"), (rc, out))
rc, out, err = psql("UPDATE users SET locale = locale WHERE false")
ctl("L0b", "calibration NÉGATIVE : une écriture est REFUSÉE par la session en lecture seule", True, rc != 0 and "read-only" in err)
rc, out, err = psql("SELECT count(*), count(DISTINCT left(id::text, 8)) FROM quotes")
nq, npref = (int(x) for x in out.split("|"))
print(f"   (mesuré maintenant : {nq} devis, {npref} préfixes ; D327 : 15 et 13 — la base a pu bouger depuis le 09/10)")
ctl("L1", "devis de la base de développement : D327 écrit 15 (relevé du 09/10)", 15, nq)
ctl("L2", "préfixes distincts de 8 caractères : D327 écrit 13", 13, npref)

# ══ BILAN ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
print()
print(f"== BILAN : {len(controles)} contrôles · {len(ecarts)} écart(s) de D327 {ecarts} · {len(ecarts_live)} écart(s) de l'état vivant {ecarts_live} · {len(constats)} constat(s) · {len(non_verifiables)} non vérifiable(s)")
print("   ventilation par famille : " + " · ".join(f"{k} {v}" for k, v in sorted(familles.items())) + f"  (somme {sum(familles.values())})")
print(f"   familles à zéro (hypothèse à vérifier, D295) : {[f for f in 'XPCRQL' if f not in familles]}")
