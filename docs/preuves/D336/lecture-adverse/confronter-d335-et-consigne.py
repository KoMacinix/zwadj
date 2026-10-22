"""D336 — lecture adverse de D335 (rang 40 repris et clos, la marque posée) ET de la consigne du 22/10/2026 (rang 41, L35-4 amendé), confrontées au dépôt.

POURQUOI IL EXISTE
  Consigne du relecteur du 22/10/2026, section 0, point 2 : « ta lecture adverse de D335 ET de CE message, contre le dépôt (ni contre ta mémoire, ni contre celle du relecteur). Sortie versée, puis
  restituée EN ENTIER dans ta réponse (forme allégée : première partie courte, seconde partie en entier). » Et, juste dessous : « Si une affirmation de ce message est fausse contre le dépôt, tu t'arrêtes
  et tu le dis ; tu ne l'adaptes pas seul. » Cet instrument est donc aussi la RÈGLE D'ARRÊT du lot : son code de sortie dit si elle est déclenchée.

  PARTIE A (courte) — D335 : l'ordre de ses commits, la provenance du code mesuré, la déclaration de ses fichiers, la marque, le registre, l'ordre des rangs, quelques chiffres de la passe relus dans ses pièces.
  PARTIE B (en entier) — la consigne : chaque affirmation qui se vérifie dans le dépôt est confrontée à sa SOURCE à `b8ba85a` (le SHA de départ du lot) ; ce qui ne vit que dans le chat ou hors dépôt est
  déclaré NON VÉRIFIABLE. Une affirmation démentie est un ÉCART DE LA CONSIGNE ; une affirmation vraie mais qui demande une précision est un CONSTAT.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D336/lecture-adverse/confronter-d335-et-consigne.py > docs/preuves/D336/lecture-adverse/confronter-sortie.txt
  Code de sortie : 0 = aucun écart · 1 = écart de D335 ou de l'état vivant · 2 = calibration manquée (abandon) · 3 = écart de la consigne : LA RÈGLE D'ARRÊT EST DÉCLENCHÉE.

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF la famille X (état LIVE : `git status`, `stash`, `rev-parse`, le reflog de `origin/main`).
  La seule écriture est un dossier temporaire : une copie de `packages/types/src/phone.ts` lue à `b8ba85a`, exécutée par Node (`--experimental-strip-types`) pour MESURER ce que la fonction rend — le texte de la
  consigne parle d'un comportement, pas d'un commentaire. Aucune porte, aucune campagne, aucune base de données.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d334.py` (D335) — il juge D334 et ses SHA ; croire les nombres que D335 imprime dans sa section — ils sont RELUS ici dans les pièces brutes de la passe
  (`docs/preuves/D334/passe-r40-20261017-reprise/`) ; chercher les affirmations de la consigne par `grep` ligne à ligne — les fichiers d'autorité sont enveloppés, toute recherche se fait sur le texte APLATI (D294).

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils ont
  PARCOURU et leur attendu à côté (D290), le total avec sa ventilation par famille (D295). Un attendu est LU dans la consigne ou dans le texte de D335 — jamais écrit de mémoire (D275) ; la consigne est citée
  par courts extraits, avec sa section, parce que son texte n'est pas au dépôt (il vit dans le chat).

FAMILLES : A (D335, partie A) · X (état LIVE) · B0 à B8 (la consigne, par section ; partie B).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

FIX = "b8ba85a"        # dernier commit de D335 = SHA de départ de D336 : l'état du dépôt que la consigne décrit
DEP335 = "b92dc7a"     # dernier commit de D334 = SHA de départ de D335
CODE = "83929a6"       # le code mesuré par la marque de D335 (dernier commit de D333)
TABLE336 = "77728a5"   # la table d'ouverture de CE lot (seule)
D335_COMMITS = ["a9695c3", "a26e1b5", "2cd42a5", "2af356b", "735fb1f", "f2aca6e", "e17e0a6", "a71288e", "b8ba85a"]
CONT, AGENTS, BACKLOG = "ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"
AUTORITES = (AGENTS, BACKLOG, CONT)
PASSE = "docs/preuves/D334/passe-r40-20261017-reprise"

controles: list = []
ecarts_d335: list = []
ecarts_consigne: list = []
ecarts_live: list = []
constats: list = []
non_verifiables: list = []
familles: dict = {}
bras = [0, 0]  # joués, manqués


def git(*args: str) -> bytes:
    return subprocess.run(["git", "-c", "core.quotepath=false", *args], capture_output=True, check=True).stdout


# ── EXTRACTEURS ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def lire(sha: str, chemin: str):
    """Le texte d'un fichier à un SHA, ou None s'il n'existe pas à ce SHA."""
    r = subprocess.run(["git", "show", f"{sha}:{chemin}"], capture_output=True)
    return r.stdout.decode("utf-8").replace("\r\n", "\n") if r.returncode == 0 else None


def aplatir(t: str) -> str:
    """Espaces insécables ramenés à l'espace, tout blanc ramené à UN espace (D294 : les fichiers d'autorité sont enveloppés)."""
    return re.sub(r"\s+", " ", t.replace(" ", " ").replace(" ", " "))


def present(t: str, motif: str) -> bool:
    return aplatir(motif) in aplatir(t)


def compter(t: str, motif: str) -> int:
    return aplatir(t).count(aplatir(motif))


def fichiers_du_commit(sha: str) -> list:
    return [l for l in git("show", "--name-only", "--format=", sha).decode("utf-8").split("\n") if l.strip()]


def numstat(sha: str) -> list:
    sortie = []
    for l in git("show", "--numstat", "--format=", sha).decode("utf-8").split("\n"):
        if l.strip():
            a, r, p = l.split("\t")
            sortie.append((int(a), int(r), p))
    return sortie


def noms_diff(a: str, b: str) -> list:
    return [l for l in git("diff", "--name-only", a, b).decode("utf-8").split("\n") if l.strip()]


def rev_list(a: str, b: str) -> list:
    return [l[:7] for l in git("rev-list", "--reverse", f"{a}..{b}").decode("utf-8").split("\n") if l.strip()]


def heure_commit(sha: str) -> datetime:
    """L'heure LOCALE du commit (le poste est réglé sur America/Toronto) — comparée à des heures locales de pièces."""
    iso = git("log", "-1", "--format=%cI", sha).decode("utf-8").strip()
    return datetime.fromisoformat(iso).replace(tzinfo=None)


def chemins_de_table(t: str) -> set:
    """Tous les chemins entre accents graves de la PREMIÈRE cellule de chaque ligne de table (une cellule peut en porter plusieurs)."""
    chemins = set()
    for l in t.split("\n"):
        if l.startswith("| `"):
            chemins.update(re.findall(r"`([^`]+)`", l[2:].split(" | ", 1)[0]))
    return chemins


def section(t: str, titre: str, niveau: str = "## "):
    """Du titre (début de ligne) jusqu'au titre suivant de même niveau ou plus haut ; None si absent ou ambigu."""
    lignes = t.split("\n")
    debuts = [i for i, l in enumerate(lignes) if l.startswith(titre)]
    if len(debuts) != 1:
        return None
    i = debuts[0]
    profondeur = len(niveau.strip())
    j = i + 1
    while j < len(lignes):
        m = re.match(r"^(#+) ", lignes[j])
        if m and len(m.group(1)) <= profondeur:
            break
        j += 1
    return "\n".join(lignes[i:j])


def bloc(t: str, debut: str, fin: str):
    """Le texte entre une ancre UNIQUE et la première occurrence de `fin` après elle ; None si l'ancre n'est pas unique."""
    if t.count(debut) != 1:
        return None
    i = t.index(debut)
    j = t.find(fin, i + len(debut))
    return t[i:] if j < 0 else t[i:j]


def ligne_qui_commence(t: str, prefixe: str):
    lignes = [l for l in t.split("\n") if l.startswith(prefixe)]
    return lignes[0] if len(lignes) == 1 else None


def modele(schema: str, nom: str):
    m = re.search(r"^(model|enum) " + re.escape(nom) + r" \{\n(.*?)^\}", schema, re.M | re.S)
    return m.group(2) if m else None


def est_production(chemin: str) -> bool:
    """Un fichier TypeScript de production d'une application ou d'un paquet : ni test, ni spec, ni double, ni code généré."""
    if not re.match(r"^(apps|packages)/", chemin) or not re.search(r"\.(ts|tsx)$", chemin):
        return False
    if re.search(r"\.(spec|test|int-spec|e2e)\.(ts|tsx)$", chemin):
        return False
    return not re.search(r"/(test|tests|__tests__|test-support|generated)/", chemin)


def git_grep_fichiers(sha: str, motif: str, *chemins: str) -> list:
    r = subprocess.run(["git", "-c", "core.quotepath=false", "grep", "-l", "-I", "-E", motif, sha, "--", *chemins], capture_output=True)
    if r.returncode not in (0, 1):
        raise RuntimeError(r.stderr.decode("utf-8"))
    return sorted(l[len(sha) + 1:] for l in r.stdout.decode("utf-8").split("\n") if l.strip())


def git_grep_lignes(sha: str, motif: str, *chemins: str) -> list:
    r = subprocess.run(["git", "-c", "core.quotepath=false", "grep", "-n", "-I", "-E", motif, sha, "--", *chemins], capture_output=True)
    if r.returncode not in (0, 1):
        raise RuntimeError(r.stderr.decode("utf-8"))
    return [l[len(sha) + 1:] for l in r.stdout.decode("utf-8").split("\n") if l.strip()]


def fichiers_suivis(sha: str, prefixe: str) -> list:
    return [l for l in git("ls-tree", "-r", "--name-only", sha, "--", prefixe).decode("utf-8").split("\n") if l.strip()]


NODE = shutil.which("node")


def normaliser_telephones(sha: str, entrees: dict) -> dict:
    """MESURE : exécute `normalizePhone("DZ", …)` de `packages/types/src/phone.ts` lu à `sha` (le fichier n'importe rien)."""
    source = lire(sha, "packages/types/src/phone.ts")
    with tempfile.TemporaryDirectory() as d:
        with open(os.path.join(d, "phone.ts"), "w", encoding="utf-8", newline="\n") as f:
            f.write(source)
        with open(os.path.join(d, "mesure.mjs"), "w", encoding="utf-8", newline="\n") as f:
            f.write('import { normalizePhone } from "./phone.ts";\n'
                    f"const entrees = {json.dumps(entrees, ensure_ascii=True)};\n"
                    "const sortie = {};\n"
                    'for (const [nom, v] of Object.entries(entrees)) sortie[nom] = normalizePhone("DZ", v);\n'
                    "console.log(JSON.stringify(sortie));\n")
        r = subprocess.run([NODE, "--experimental-strip-types", "--no-warnings", "mesure.mjs"], cwd=d, capture_output=True)
        if r.returncode != 0:
            raise RuntimeError(r.stderr.decode("utf-8"))
        return json.loads(r.stdout.decode("utf-8"))


# ── CALIBRATION ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def calibrer(nom: str, vrai: bool, faux: bool) -> None:
    """`vrai` : l'extracteur, sur un cas connu VRAI, doit rendre vrai ; `faux` : sur un cas connu FAUX, doit rendre faux."""
    for bras_nom, attendu, obtenu in (("cas vrai", True, vrai), ("cas faux", False, faux)):
        bras[0] += 1
        ok = attendu == obtenu
        if not ok:
            bras[1] += 1
        print(f"  {'✓' if ok else '✗'} calibration · {nom} · {bras_nom} : rendu {obtenu} (attendu {attendu})")


print(f"D336 — lecture adverse de D335 et de la consigne du 22/10/2026 · SHA fixés : départ {FIX}, D335 {DEP335}..{FIX}, code mesuré {CODE}, table {TABLE336}")
print("CALIBRATION (deux bras par extracteur)")
C_FIX, A_FIX, B_FIX = lire(FIX, CONT), lire(FIX, AGENTS), lire(FIX, BACKLOG)
SCHEMA = lire(FIX, "apps/api/prisma/schema.prisma")
calibrer("lire", lire(FIX, "pnpm-workspace.yaml") is not None and "packages" in lire(FIX, "pnpm-workspace.yaml"),
         lire(FIX, "chemin/qui/n-existe/pas.txt") is not None)
calibrer("present (texte aplati)", present(A_FIX, "## SOLID & patterns"), present(A_FIX, "## SOLID & patternz"))
calibrer("present (enjambe un retour à la ligne)", present("une phrase\ncoupée en deux", "phrase coupée"), present("une phrase\ncoupée en deux", "phrase entière"))
calibrer("compter", compter(C_FIX, "| D335 | A |") == 1, compter(C_FIX, "| D336 | A |") == 1)
calibrer("fichiers_du_commit", fichiers_du_commit("a9695c3") == ["docs/preuves/D335/table-ouverture.md"],
         fichiers_du_commit("a26e1b5") == ["docs/preuves/D335/table-ouverture.md"])
calibrer("numstat", numstat("2af356b") == [(12, 0, CONT)], all(r == 0 for _, r, _ in numstat("735fb1f")))
calibrer("noms_diff", noms_diff("a9695c3^", "a9695c3") == ["docs/preuves/D335/table-ouverture.md"],
         noms_diff("a26e1b5^", "a26e1b5") == ["docs/preuves/D335/table-ouverture.md"])
calibrer("rev_list", rev_list(DEP335, FIX)[:1] == ["a9695c3"], rev_list(FIX, FIX) != [])
calibrer("heure_commit", heure_commit("a9695c3") == datetime(2026, 10, 17, 14, 9, 25), heure_commit("a9695c3") == datetime(2026, 10, 17, 14, 9, 26))
_t335 = lire(FIX, "docs/preuves/D335/table-ouverture.md")
calibrer("chemins_de_table", "docs/preuves/D335/table-ouverture.md" in chemins_de_table(_t335), "docs/preuves/D336/table-ouverture.md" in chemins_de_table(_t335))
calibrer("chemins_de_table (deux chemins dans une cellule)", "docs/preuves/D335/aucun-cookie-reel.txt" in chemins_de_table(_t335),
         "pour" in chemins_de_table(_t335))
_reg = section(C_FIX, "## Registre des décisions")
calibrer("section", _reg is not None and "| D335 | A |" in _reg and "## Le projet en une phrase" not in _reg, section(C_FIX, "## Titre qui n'existe pas") is not None)
calibrer("bloc (ancre unique, refus d'une ancre répétée)", bloc(C_FIX, "**R1. LE SECOND TEXTE L'EMPORTE SUR LE PREMIER", "**R2.") is not None,
         C_FIX.count("⇒ **RANG") > 1 and bloc(C_FIX, "⇒ **RANG", "\n") is not None)
calibrer("ligne_qui_commence", ligne_qui_commence(C_FIX, "- **K-1** ") is not None, ligne_qui_commence(C_FIX, "- **K-99** ") is not None)
calibrer("modele", modele(SCHEMA, "Quote") is not None and "referenceNumber" in modele(SCHEMA, "Quote"), modele(SCHEMA, "ModeleInexistant") is not None)
calibrer("est_production", est_production("apps/api/src/venues/quotes.service.ts") and est_production("apps/pro/src/dashboard/walkin-contact.ts"),
         est_production("apps/api/src/venues/quotes.service.spec.ts") or est_production("apps/pro/src/test-support/client-doubles.ts")
         or est_production("apps/api/test/int/quotes.int-spec.ts") or est_production("docs/preuves/D327/releve/client/walkin-flux.capture.ts"))
calibrer("git_grep_fichiers", git_grep_fichiers(FIX, r"export function normalizePhone\(", "packages") == ["packages/types/src/phone.ts"],
         git_grep_fichiers(FIX, "ZZZ_jamais_ecrit_nulle_part_ZZZ", ".") != [])
calibrer("fichiers_suivis", len(fichiers_suivis(FIX, "docs/preuves/D335/lecture-adverse")) == 4, len(fichiers_suivis(FIX, "docs/preuves/D336")) > 0)
if NODE is None:
    print("  ✗ calibration · Node introuvable : la mesure de `normalizePhone` est impossible")
    bras[0] += 1
    bras[1] += 1
else:
    _cal = normaliser_telephones(FIX, {"valide": "0555123456", "fixe": "021234567"})
    calibrer("normaliser_telephones (exécution réelle de phone.ts)", _cal["valide"] == "+213555123456", _cal["fixe"] is not None)
print(f"  calibration : {bras[0]} bras joués, {bras[1]} manqué(s) (attendu 0)")
if bras[1]:
    print("ABANDON : un bras de calibration manque — aucun contrôle n'est joué (D286).")
    sys.exit(2)


# ── CONTRÔLES ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def controle(cid: str, famille: str, libelle: str, attendu, mesure, ok: bool, parcouru: str = "") -> None:
    familles.setdefault(famille, [0, 0])
    familles[famille][0] += 1
    if not ok:
        familles[famille][1] += 1
        cible = ecarts_consigne if famille.startswith("B") else ecarts_live if famille == "X" else ecarts_d335
        cible.append(cid)
    suffixe = f" — parcouru : {parcouru}" if parcouru else ""
    controles.append(f"| {cid} | {libelle} | attendu : {attendu} · mesuré : {mesure}{suffixe} | {'✓' if ok else '✗'} |")


def constat(cid: str, texte: str) -> None:
    constats.append(f"- **{cid}** — {texte}")


def nv(cid: str, texte: str) -> None:
    non_verifiables.append(f"- **{cid}** — {texte}")


# PARTIE A — D335 (courte) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
commits = rev_list(DEP335, FIX)
_ordre = bloc(C_FIX, "#### NOTE D'OUVERTURE DE LA REPRISE (S-38", "#### Fichiers attendus")
_lignes_ordre = re.findall(r"^\| (\d+) \| (?:`([0-9a-f]{7})`|\(celui-ci\)) \|", (_ordre or "").split("#### Ordre des commits de ce lot", 1)[-1], re.M)
_shas_table = [s for _, s in _lignes_ordre if s]
controle("A1", "A", "les commits de D335 (rev-list b92dc7a..b8ba85a) = les 8 SHA de sa table « ordre des commits » + « (celui-ci) » = b8ba85a",
         "8 + 1 = " + str(len(D335_COMMITS)), f"{len(commits)} commits ; table : {len(_shas_table)} SHA + {len(_lignes_ordre) - len(_shas_table)} « (celui-ci) »",
         commits == D335_COMMITS and _shas_table == D335_COMMITS[:-1] and len(_lignes_ordre) == 9, f"{len(_lignes_ordre)} lignes de table")
controle("A2", "A", "le PREMIER commit de D335 ne contient que `docs/preuves/D335/table-ouverture.md`", "1 fichier, la table",
         fichiers_du_commit(commits[0]), fichiers_du_commit(commits[0]) == ["docs/preuves/D335/table-ouverture.md"])
_avant = commits[1:3]
_touche_md = [c for c in _avant if any(p in AUTORITES for p in fichiers_du_commit(c))]
controle("A3", "A", "avant la première écriture d'autorité (2af356b), ni la lecture adverse (a26e1b5) ni la passe D277 (2cd42a5) ne touchent un `.md` d'autorité ; la sortie de la lecture y est",
         "0 commit qui touche un `.md` · sortie présente", f"{len(_touche_md)} · {'docs/preuves/D335/lecture-adverse/confronter-sortie.txt' in fichiers_du_commit('a26e1b5')}",
         not _touche_md and "docs/preuves/D335/lecture-adverse/confronter-sortie.txt" in fichiers_du_commit("a26e1b5") and commits[3] == "2af356b")
controle("A4", "A", "la première écriture d'autorité (2af356b) ne touche que `ZWADJ_CONTINUITE.md` et n'efface rien", "[(12, 0, ZWADJ_CONTINUITE.md)]",
         numstat("2af356b"), numstat("2af356b") == [(12, 0, CONT)])
_ajout = [l[1:] for l in git("show", "--format=", "-U0", "2af356b").decode("utf-8").split("\n") if l.startswith("+") and not l.startswith("+++")]
_ko = [l for l in _ajout if l.strip() and (l.startswith("« 1.") or re.match(r"^[2-5]\. ", l))]
_absents = [l for l in _ko if not present(C_FIX, l)]
controle("A5", "A", "le texte de Ko du 17/10 (cinq points) écrit par 2af356b est présent, MOT POUR MOT, à la clôture (b8ba85a), texte aplati",
         "5 points, 0 absent", f"{len(_ko)} points, {len(_absents)} absent(s)", len(_ko) == 5 and not _absents)
_prog = lire(FIX, f"{PASSE}/progression.txt") or ""
_m = re.match(r"(\d\d)/(\d\d)/(\d{4}) (\d\d):(\d\d):(\d\d) PASSE r40-20261017-reprise", _prog)
_debut_passe = datetime(int(_m.group(3)), int(_m.group(2)), int(_m.group(1)), int(_m.group(4)), int(_m.group(5)), int(_m.group(6))) if _m else None
controle("A6", "A", "la note d'ouverture (f2aca6e) est commitée AVANT le démarrage de la passe (première ligne de `progression.txt`)",
         "heure du commit < début de la passe", f"{heure_commit('f2aca6e').time()} < {_debut_passe.time() if _debut_passe else '?'}",
         _debut_passe is not None and heure_commit("f2aca6e") < _debut_passe)
_ext = chemins_de_table(lire("e17e0a6", "docs/preuves/D335/table-ouverture.md"))
_verses = fichiers_du_commit("a71288e")
_non_decl = [p for p in _verses if p not in _ext]
controle("A7", "A", "l'extension 1 (e17e0a6) ne contient que la table, précède le versement (a71288e), et déclare chacun des fichiers versés en chemin complet",
         "table seule · 0 non déclaré", f"{fichiers_du_commit('e17e0a6')} · {len(_non_decl)} non déclaré(s)",
         fichiers_du_commit("e17e0a6") == ["docs/preuves/D335/table-ouverture.md"] and not _non_decl and commits.index("e17e0a6") < commits.index("a71288e"),
         f"{len(_verses)} fichiers versés")
_hors = sorted({p for p in noms_diff(CODE, FIX) if not p.startswith("docs/preuves/")})
controle("A8", "A", "le code de `b8ba85a` est celui que la marque a mesuré (83929a6) : le diff 83929a6..b8ba85a ne contient, hors `docs/preuves/`, que les trois `.md` d'autorité",
         sorted(AUTORITES), _hors, _hors == sorted(AUTORITES), f"{len(noms_diff(CODE, FIX))} fichiers")
_table_finale = chemins_de_table(lire(FIX, "docs/preuves/D335/table-ouverture.md"))
_diff335 = noms_diff(DEP335, FIX)
_hors_table = [p for p in _diff335 if p not in _table_finale and p not in AUTORITES]
controle("A9", "A", "tout le diff de D335 (b92dc7a..b8ba85a) = des chemins de sa table finale (extensions comprises) + les trois `.md`",
         "0 hors table", f"{len(_hors_table)} hors table", not _hors_table, f"{len(_diff335)} fichiers, {len(_table_finale)} chemins de table")
_dernier = re.findall(r"^\| (D\d+) \| [AFCS] \|", _reg, re.M)
controle("A10", "A", "la dernière ligne du registre à b8ba85a est D335 (le prochain numéro est donc D336)", "D335", _dernier[-1] if _dernier else None,
         bool(_dernier) and _dernier[-1] == "D335", f"{len(_dernier)} lignes de registre")
_marque = "Portes vertes AU REPOS le 17/10/2026, et D331, D332 et D333 en font partie"
controle("A11", "A", "la marque de D335 est écrite dans `ZWADJ_CONTINUITE.md` ET dans `AGENTS.md`", "≥ 1 et ≥ 1", f"{compter(C_FIX, _marque)} et {compter(A_FIX, _marque)}",
         compter(C_FIX, _marque) >= 1 and compter(A_FIX, _marque) >= 1)
_ordre_rangs = section(C_FIX, "## ORDRE DES RANGS")
_rangs = [l for l in (_ordre_rangs or "").split("\n") if l.startswith("⇒ **RANG")]
controle("A12", "A", "la dernière ligne « ⇒ RANG N » de l'ordre des rangs écrit « RANG 41 : EN ATTENTE D'ARBITRAGE DE KO »", "présent",
         "présent" if _rangs and "RANG 41 : EN ATTENTE D'ARBITRAGE DE KO" in _rangs[-1] else "absent",
         bool(_rangs) and "RANG 41 : EN ATTENTE D'ARBITRAGE DE KO" in _rangs[-1], f"{len(_rangs)} lignes « ⇒ RANG »")
_pieces = fichiers_suivis(FIX, PASSE)
controle("A13", "A", "les pièces de la passe `r40-20261017-reprise` versées : 203 fichiers (texte de D335)", 203, len(_pieces), len(_pieces) == 203)


def totaux_vitest(t: str) -> tuple:
    t = re.sub(r"\x1b\[[0-9;]*m", "", t)
    fichiers = sum(int(x) for x in re.findall(r"Test Files\s+(\d+) passed", t))
    tests = sum(int(x) for x in re.findall(r"^\s+Tests\s+(\d+) passed", t, re.M))
    echecs = len(re.findall(r"(Test Files|Tests)\s+\d+ failed", t))
    return fichiers, tests, echecs


_ti = totaux_vitest(lire(FIX, f"{PASSE}/testint.log"))
_tu = totaux_vitest(lire(FIX, f"{PASSE}/test.log"))
controle("A14", "A", "`test:int` et `test`, relus dans les journaux bruts : 493 / 39 et 1 871 / 141, aucun « failed »", "(39, 493, 0) · (141, 1871, 0)", f"{_ti} · {_tu}",
         _ti == (39, 493, 0) and _tu == (141, 1871, 0))
_e2e = lire(FIX, f"{PASSE}/e2e-EXTRAIT.txt") or ""
_rt = lire(FIX, f"{PASSE}/campagnes-tout.log") or ""
_lc = lire(FIX, f"{PASSE}/lecture-campagnes.txt") or ""
_ok_e2e = "'skipped': 1, 'passed': 55" in _e2e
_ok_tout = "MESURÉ : 482 garde(s) mordue(s) · 0 muette(s)/erreur(s) · 21 non mesurée(s) · 37 campagne(s)" in re.sub(r"\x1b\[[0-9;]*m", "", _rt)
_ok_cert = "CERTIFIANT : 527 mordues · 0 muettes · 0 non mesurées · 37 campagnes qui COMPTENT sur 37" in _lc
_ok_fin = "-Resume : code 0" in _prog and "CLÔTURE ATTEINTE" in _prog
controle("A15", "A", "e2e 55 passés · 1 ignoré ; `--tout` 482 · 0 · 21 sur 37 ; CERTIFIANT 527 · 0 · 0, 37 sur 37 ; la passe atteint sa clôture",
         "4 × vrai", f"{_ok_e2e}, {_ok_tout}, {_ok_cert}, {_ok_fin}", _ok_e2e and _ok_tout and _ok_cert and _ok_fin)
_d335 = section(C_FIX, "## Session du 17/10/2026 — D335")
_s = bloc(_d335 or "", "**Décisions de la session, À RATIFIER PAR KO**", "**Ce que la session a remarqué")
_s_ids = [int(x) for x in re.findall(r"^- \*\*S-(\d+)\*\* —", _s or "", re.M)]
controle("A16", "A", "S-40 à S-47 sont les décisions de la session D335, écrites « À RATIFIER PAR KO »", list(range(40, 48)), _s_ids, _s_ids == list(range(40, 48)))

# FAMILLE X — état LIVE ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
_head = git("rev-parse", "--short=7", "HEAD").decode().strip()
_parent = git("rev-parse", "--short=7", "HEAD^").decode().strip()
_origin = git("rev-parse", "--short=7", "origin/main").decode().strip()
controle("X1", "X", "HEAD = la table de ce lot, posée sur b8ba85a ; `origin/main` = b8ba85a (fetch du début de session)", f"{TABLE336} ← {FIX} · origin {FIX}",
         f"{_head} ← {_parent} · origin {_origin}", _head == TABLE336 and _parent == FIX and _origin == FIX)
_statut = [l for l in git("status", "--porcelain=v1").decode("utf-8").split("\n") if l.strip()]
_suivis_modifies = [l for l in _statut if not l.startswith("?? ")]
_non_suivis_ailleurs = [l for l in _statut if l.startswith("?? ") and not l[3:].startswith("docs/preuves/D336/")]
controle("X2", "X", "arbre : aucun fichier suivi modifié ; seuls des fichiers NON SUIVIS sous `docs/preuves/D336/` (cette lecture)", "0 · 0",
         f"{len(_suivis_modifies)} · {len(_non_suivis_ailleurs)}", not _suivis_modifies and not _non_suivis_ailleurs, f"{len(_statut)} lignes de `git status`")
_stash = [l for l in git("stash", "list").decode("utf-8").split("\n") if l.strip()]
controle("X3", "X", "aucun stash", 0, len(_stash), not _stash)

# PARTIE B — la consigne du 22/10/2026, section par section ─────────────────────────────────────────────────────────────────────────────
# § 0
controle("B0-1", "B0", "§ 0 « règle de Ko, D328 » : la règle de l'ordre des commits est dans `AGENTS.md`, datée D328", "présente",
         present(A_FIX, "L'ORDRE DES COMMITS D'UN LOT EST FIXÉ, ET C'EST `git` QUI LE PROUVE — règle de Ko, acceptée le 11/10/2026 (D328)"),
         present(A_FIX, "L'ORDRE DES COMMITS D'UN LOT EST FIXÉ, ET C'EST `git` QUI LE PROUVE — règle de Ko, acceptée le 11/10/2026 (D328)"))
controle("B0-2", "B0", "§ 0 « contrôle de fin de lot D288 » : local et `origin` sur le même SHA (D288) est dans `AGENTS.md`", "présent",
         present(A_FIX, "local et `origin` sur le MÊME SHA, vérifié et RAPPORTÉ, sinon le lot n'est pas clos (D288"),
         present(A_FIX, "local et `origin` sur le MÊME SHA, vérifié et RAPPORTÉ, sinon le lot n'est pas clos (D288"))
_d336 = git_grep_fichiers(FIX, "D336", ".")
controle("B0-3", "B0", "§ 0 « <numéro de décision du lot> » : le registre finit à D335, et D336 n'est attribué nulle part (un seul fichier le cite : le pointeur « le prochain lot prend D336 »)",
         "D335 · 1 fichier, 1 pointeur", f"{_dernier[-1]} · {len(_d336)} fichier(s), {compter(C_FIX, 'le prochain lot prend **D336**')} pointeur",
         _dernier[-1] == "D335" and _d336 == [CONT] and compter(C_FIX, "D336") == 1 and compter(C_FIX, "le prochain lot prend **D336**") == 1)

# § 1
nv("NV-1", "§ 1a et § 1b : les deux textes de Ko (21/10/2026, 01:25 ; 22/10/2026, 09:53) — ils vivent dans le chat ; le dépôt ne porte aucun texte de Ko daté du 21 ou du 22/10/2026 "
   f"(« 21/10/2026 » dans les trois fichiers d'autorité : {sum(compter(lire(FIX, f), '21/10/2026') for f in AUTORITES)} ; « 22/10/2026 » : {sum(compter(lire(FIX, f), '22/10/2026') for f in AUTORITES)}).")
nv("NV-2", "§ 1c : « la liste de décisions du relecteur du 21/10/2026 » (Q1 à Q12) — elle vit dans le chat ; le dépôt ne la porte pas.")
constat("C-1", "§ 1c : le bloc porte encore les signes « ⟦ ⟧ » — les questions Q1 à Q8 n'y sont pas collées. Par la consigne elle-même : **rien de Q3, Q4 et Q5 ne s'écrit** dans un fichier d'autorité "
        "(et, par la règle d'arrêt, aucun fichier d'autorité n'est écrit par ce lot).")

# § 2
controle("B2a-1", "B2", "§ 2 a) « D270 / D332 (plafond de cinq lots non certifiés, AGENTS.md) » : l'arbitrage de Ko de la limite de 5 y est, mot pour mot", "présent",
         present(A_FIX, "La limite passe à 5 lots de code non certifiés"), present(A_FIX, "La limite passe à 5 lots de code non certifiés"))
_etat40 = bloc(C_FIX, "### ⛔ ÉTAT À LA CLÔTURE DU RANG 40 (D335) — À LIRE EN PREMIER", "\n### ")
controle("B2a-2", "B2", "§ 2 a) « Compteur … ZÉRO à l'entrée du rang 41 » : l'état à la clôture du rang 40 dit ZÉRO", "ZÉRO",
         "ZÉRO" if _etat40 and "| compteur | **ZÉRO**" in _etat40 else "autre", bool(_etat40) and "| compteur | **ZÉRO**" in _etat40)
_cinq = len(re.findall(r"D-10[^.]{0,40}cinquième révision", aplatir(C_FIX)))
_six = len(re.findall(r"D-10[^.]{0,40}sixième révision", aplatir(C_FIX)))
controle("B2b-1", "B2", "§ 2 b) « D-10, sixième révision » : la cinquième révision de D-10 est écrite, aucune sixième", "5ᵉ ≥ 1 · 6ᵉ = 0", f"{_cinq} · {_six}", _cinq >= 1 and _six == 0,
         f"« sixième révision » seul : {compter(C_FIX, 'sixième révision')} occurrence (un motif de passe D277 de D333, « hypothèse, il n'existe pas »)")
controle("B2b-2", "B2", "§ 2 b) « « RANG 41 : EN ATTENTE D'ARBITRAGE DE KO » » est écrit (ordre des rangs et état à la clôture)", "≥ 1",
         compter(C_FIX, "RANG 41 : EN ATTENTE D'ARBITRAGE DE KO"), compter(C_FIX, "RANG 41 : EN ATTENTE D'ARBITRAGE DE KO") >= 1)
_pe41 = [l for l in C_FIX.split("\n") if re.match(r"^## .*rang 41\b", l)]
constat("C-2", f"§ 2 b) « Annoter … le point d'entrée du rang 41 » : **il n'existe pas encore** ({len(_pe41)} titre « ## … rang 41 » à `b8ba85a`) — il se CRÉE au rang 41, il ne s'annote pas ; "
        "« les deux lignes de l'ordre des rangs » ne sont pas nommées par la consigne (lecture probable : la ligne « ⇒ RANG 41 » et la ligne de la cinquième révision de D-10).")
controle("B2c-1", "B2", "§ 2 c) « D330, forme de revue des chemins d'identité (B, C, D) » : les trois formes sont écrites (D330)", "3 présentes",
         sum(present(C_FIX, m) for m in ("**FORME B (D302, étendue par D303)**", "- **C** *(proposition du relecteur, adoptée par Ko le 12/10/2026)*",
                                          "- **D** *(proposition du relecteur, adoptée par Ko le 12/10/2026)*")),
         all(present(C_FIX, m) for m in ("**FORME B (D302, étendue par D303)**", "- **C** *(proposition du relecteur, adoptée par Ko le 12/10/2026)*",
                                          "- **D** *(proposition du relecteur, adoptée par Ko le 12/10/2026)*")))
controle("B2c-2", "B2", "§ 2 c) « C (liste de scénarios de Ko, écrite AVANT le code) » et « D … MISE EN SERVICE RÉELLE » : décision 4 du relecteur de D330 et l'entrée D du backlog", "2 présentes",
         f"{present(C_FIX, 'LA LISTE C de L35-5 et de L35-6 est écrite AVANT le code')}, {present(C_FIX, 'BLOQUE : la mise en service réelle de L35-5 et L35-6')}",
         present(C_FIX, "LA LISTE C de L35-5 et de L35-6 est écrite AVANT le code") and present(C_FIX, "BLOQUE : la mise en service réelle de L35-5 et L35-6"))
_r1 = bloc(C_FIX, "**R1. LE SECOND TEXTE L'EMPORTE SUR LE PREMIER", "**R2.")
_r1_puces = [l for l in (_r1 or "").split("\n") if l.startswith("- ")]
controle("B2d-1", "B2", "§ 2 d) « R1 (3ᵉ point) » : le troisième point de R1 est celui du numéro « accessible à tous les pros »", "le 3ᵉ point en parle",
         _r1_puces[2][:90] + "…" if len(_r1_puces) > 2 else None, len(_r1_puces) > 2 and "« accessible à tous les pros »" in _r1_puces[2], f"{len(_r1_puces)} puces de R1")
_m4 = ligne_qui_commence(C_FIX, "| **M-4** |")
_k1 = ligne_qui_commence(C_FIX, "- **K-1** ")
_r4_ok = present(C_FIX, "**R4. L'EXCEPTION (question 2)**")
_m4_ok = bool(_m4 and "égalité stricte" in _m4)
_k1_ok = bool(_k1 and "forme identique" in _k1)
controle("B2d-2", "B2", "§ 2 d) « R4, M-4, K-1 » : R4 (l'exception), M-4 (l'égalité stricte), K-1 (forme identique) existent", "3 présents",
         f"R4 {_r4_ok}, M-4 {_m4_ok}, K-1 {_k1_ok}", _r4_ok and _m4_ok and _k1_ok)
_db8 = ligne_qui_commence(C_FIX, "- **DB-8** —")
controle("B2e-1", "B2", "§ 2 e) « DB-8 » : l'entrée existe et porte la règle de Ko du 12/10 que l'annotation remplacerait (« numéro obligatoire pour toute fiche »)", "présente",
         bool(_db8 and "Un numéro de téléphone est obligatoire pour toute fiche client" in _db8), bool(_db8 and "Un numéro de téléphone est obligatoire pour toute fiche client" in _db8))
_pp = modele(SCHEMA, "ProProfile") or ""
_us = modele(SCHEMA, "User") or ""
controle("B2e-2", "B2", "§ 2 e) « son second numéro (pro_profiles.phone2) » et « son e-mail de compte » : `ProProfile.phone2` (nullable) et `User.email` (unique) existent", "2 présents",
         f"phone2 {bool(re.search(r'^\s*phone2\s+String\?', _pp, re.M))}, email {bool(re.search(r'^\s*email\s+String\s+@unique', _us, re.M))}",
         bool(re.search(r"^\s*phone2\s+String\?", _pp, re.M)) and bool(re.search(r"^\s*email\s+String\s+@unique", _us, re.M)))
controle("B2f-1", "B2", "§ 2 f) « C-C1 (erratum du 13/10) » : l'erratum du relecteur sur C-C1 est écrit par D330, annoté au 13/10/2026", "2 présents",
         f"{present(C_FIX, '**1. ERRATUM DU RELECTEUR (C-C1).**')}, {present(C_FIX, '(D330, 13/10/2026 : **ERRATUM DU RELECTEUR**')}",
         present(C_FIX, "**1. ERRATUM DU RELECTEUR (C-C1).**") and present(C_FIX, "(D330, 13/10/2026 : **ERRATUM DU RELECTEUR**"))
constat("C-3", "§ 2 f) « erratum du 13/10 » : l'erratum est une décision du relecteur **déléguée par Ko le 12/10/2026** (« DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO LE 12/10/2026 (D330) »), "
        "**écrite le 13/10/2026** par D330 — la date de la consigne est celle de l'écriture. Sans incidence.")
_l354 = ligne_qui_commence(B_FIX, "- [ ] **[API][PRO]** **L35-4 — LA FICHE CLIENT D'UN PRO ET LE NOM SUR LE DEVIS**")
controle("B2f-2", "B2", "§ 2 f) « D61, entrée L35-4 précision (5) » : D61 est la demande de VISITE ; l'entrée L35-4 du backlog porte sa précision (5)", "2 présents",
         f"{present(C_FIX, 'D61 est le corps de la demande de **VISITE**')}, {bool(_l354 and '(5) D61 :' in _l354)}",
         present(C_FIX, "D61 est le corps de la demande de **VISITE**") and bool(_l354 and "(5) D61 :" in _l354))
_booking_ts = lire(FIX, "packages/types/src/booking.ts") or ""
_bcs = bloc(_booking_ts, "export const bookingCreateSchema", "\nexport ")
_bk = modele(SCHEMA, "Booking") or ""
_init = lire(FIX, "apps/api/prisma/migrations/20260707000000_init/migration.sql") or ""
_bk_sql = bloc(_init, 'CREATE TABLE "bookings"', ");")
controle("B2f-3", "B2", "§ 2 f) « bookingCreateSchema, bookings.contact_phone NOT NULL » : le schéma exige `contactPhone` ; la colonne est NOT NULL (Prisma ET migration)", "3 × vrai",
         f"{bool(_bcs and 'contactPhone: dzPhoneSchema,' in _bcs)}, {bool(re.search(r'^\s*contactPhone\s+String\s+@map', _bk, re.M))}, {bool(_bk_sql and chr(34) + 'contact_phone' + chr(34) + ' TEXT NOT NULL' in _bk_sql)}",
         bool(_bcs and "contactPhone: dzPhoneSchema," in _bcs) and bool(re.search(r"^\s*contactPhone\s+String\s+@map", _bk, re.M))
         and bool(_bk_sql and '"contact_phone" TEXT NOT NULL' in _bk_sql))
controle("B2g-1", "B2", "§ 2 g) « Entrée « UIP-E — Fiche client » » existe au backlog", "≥ 1", compter(B_FIX, "**UIP-E — Fiche client**"), compter(B_FIX, "**UIP-E — Fiche client**") >= 1)
controle("B2h-1", "B2", "§ 2 h) « R8, C-C3, DB-17 » existent", "3 présents",
         sum(present(C_FIX, m) for m in ("**R8. LA COPIE DU NOM SUR LE DEVIS", "**C-C3 — DB-17 × R8**", "- **DB-17** — **deux personnes, un numéro**")),
         all(present(C_FIX, m) for m in ("**R8. LA COPIE DU NOM SUR LE DEVIS", "**C-C3 — DB-17 × R8**", "- **DB-17** — **deux personnes, un numéro**")))
# § 2 i) — J-8 à J-13
_juriste = section(C_FIX, "### 7. Les questions pour le juriste", "### ") or ""
_j_def = [int(x) for x in re.findall(r"^- \*\*J-(\d+)\*\* —", _juriste, re.M)]
_j_def_ailleurs = {f: [n for n in range(8, 14) if f"**J-{n}**" in lire(FIX, f)] for f in AUTORITES}
_j_toutes = git_grep_lignes(FIX, r"(^|[^A-Za-z0-9-])J-(8|9|1[0-3])([^0-9]|$)", CONT, AGENTS, BACKLOG)
_titre_7 = present(B_FIX, "**LES SEPT QUESTIONS POUR LE JURISTE (J-1 à J-7)**")
controle("B2i-1", "B2", "§ 2 i) « J-8 à J-13 : liste de CONTRÔLE de la mise en service … Ils ne bloquent plus le développement » : des questions J-8 à J-13 existent dans les fichiers d'autorité",
         "J-8 à J-13 définies", f"questions définies au § 7 du cadrage : J-{min(_j_def)} à J-{max(_j_def)} ; « **J-8** » à « **J-13** » : {sum(len(v) for v in _j_def_ailleurs.values())} définition ; "
         f"titre du backlog « LES SEPT QUESTIONS POUR LE JURISTE (J-1 à J-7) » : {_titre_7}",
         max(_j_def) >= 13 or any(_j_def_ailleurs.values()), f"{len(_j_def)} questions, {len(_j_toutes)} lignes portant un jeton J-8…J-13")
MARQUEURS_HARNAIS = ("r33", "neutralize", "cible", "garde", "harnais", "mordu", "muette", "ancre", "retitrée", "toBeDisabled", "getByRole",
                     "J-1 à J-10", "J-9 à J-13", "J-5 à J-8", "SV-8", "T-3", "M-11")
_classees, _non_classees = 0, 0
_occurrences = 0
for occ in _j_toutes:
    fichier, num, texte = occ.split(":", 2)
    for m in re.finditer(r"(?<![A-Za-z0-9-])J-(8|9|1[0-3])(?![0-9])", texte):
        _occurrences += 1
        fenetre = texte[max(0, m.start() - 200): m.end() + 120]
        harnais = any(k in fenetre for k in MARQUEURS_HARNAIS)
        _classees += harnais
        _non_classees += not harnais
        contexte = aplatir(texte[max(0, m.start() - 70): m.end() + 40])
        controles.append(f"|   ↳ | `{m.group(0)}` à `{fichier}:{num}` — « …{contexte}… » | contexte de harnais (marqueur dans ±200 car.) : {harnais} | · |")
controle("B2i-2", "B2", "§ 2 i) …et aucune des occurrences de J-8…J-13 dans les trois fichiers d'autorité n'est une question pour le juriste : toutes sont des cibles de harnais (r33 et voisins)",
         f"{_occurrences} sur {_occurrences} en contexte de harnais", f"{_classees} classées, {_non_classees} non classée(s)", _non_classees == 0 and _occurrences > 0,
         f"{len(_j_toutes)} lignes, {_occurrences} occurrences ; marqueurs : {', '.join(MARQUEURS_HARNAIS)}")
constat("C-4", f"§ 2 i) : la loi 25-11 n'est citée nulle part au dépôt ({sum(compter(lire(FIX, f), '25-11') for f in AUTORITES)} occurrence dans les trois fichiers d'autorité) ; "
        f"le « registre » a déjà une entrée (`ZWADJ_BACKLOG.md`, 23.11 : « Maintain data-processing register (Law 18-07) » — {compter(B_FIX, 'Maintain data-processing register (Law 18-07)')} occurrence).")
nv("NV-3", "§ 2 i) et § 3 : la loi 18-07 (art. 7, 12 à 21, 44), la loi 25-11 (art. 41 bis, JO n° 48 du 24/07/2025), le décret 05-468, les résumés (Gide, UpGrowth) — hors dépôt.")
controle("B2j-1", "B2", "§ 2 j) « S-40 à S-47 (D335) » sont bien les décisions de D335 à ratifier", list(range(40, 48)), _s_ids, _s_ids == list(range(40, 48)))
constat("C-5", "§ 1c contre § 2 j) : 1c range « S-40 à S-47 » parmi Q9 à Q12, « **sans réponse de Ko**, défauts du relecteur » ; 2 j) écrit « **ratifiées par Ko** le 22/10/2026 » (l'en-tête du § 2 : "
        "« adopté par Ko tel quel »). Une ratification par adoption du message, pas une réponse de Ko : à écrire ainsi, sinon la ligne se lit comme une parole de Ko.")

# § 3
controle("B3-1", "B3", "§ 3 D1 « aucun client réel au 12/10, confirmé par Ko » : le texte de Ko du 12/10 le dit", "présent",
         present(C_FIX, "Je confirme qu'il n'y a aucun client réel à ce jour."), present(C_FIX, "Je confirme qu'il n'y a aucun client réel à ce jour."))
_vps = modele(SCHEMA, "VenuePublicationStatus") or ""
_al = modele(SCHEMA, "AuditLog") or ""
controle("B3-2", "B3", "§ 3 D2 « publicationStatus = PUBLISHED », « audit_logs » : la valeur et la table existent", "2 présents",
         f"{bool(re.search(r'^\s*PUBLISHED\b', _vps, re.M))}, {'@@map(' + chr(34) + 'audit_logs' + chr(34) + ')' in _al}",
         bool(re.search(r"^\s*PUBLISHED\b", _vps, re.M)) and '@@map("audit_logs")' in _al)
_cp = [f for f in git_grep_fichiers(FIX, "contactPhone|contact_phone", "apps", "packages") if est_production(f)]
_cp_api = [f for f in _cp if f.startswith(("apps/api/", "packages/types/"))]
_cp_apps = [f for f in _cp if f.startswith(("apps/client/", "apps/pro/"))]
_cp_autres = [f for f in _cp if f not in _cp_api and f not in _cp_apps]
controle("B3-3", "B3", "§ 3 D3 « le champ apparaît dans 15 fichiers de production — 10 API/types, 5 apps » (fichiers TypeScript suivis, hors tests, specs, doubles et code généré ; `contactPhone` ou `contact_phone`)",
         "15 = 10 + 5", f"{len(_cp)} = {len(_cp_api)} + {len(_cp_apps)} (+ {len(_cp_autres)} ailleurs)", len(_cp) == 15 and len(_cp_api) == 10 and len(_cp_apps) == 5,
         "les fichiers : " + ", ".join(_cp))
constat("C-6", "§ 3 D3 : le compte « 15 » tient pour les fichiers **TypeScript** ; `apps/api/prisma/schema.prisma` porte aussi le champ (il serait le 16ᵉ), et deux captures de "
        "`docs/preuves/D327/` aussi (pièces, pas du code). `visit-bookings.service.ts` y est pour `visit_bookings.contact_phone`, une autre table.")
_qs = lire(FIX, "apps/api/src/venues/quotes.service.ts") or ""
_qm = modele(SCHEMA, "Quote") or ""
_store = lire(FIX, "apps/api/src/venues/quote-store.prisma.ts") or ""
controle("B3-4", "B3", "§ 3 D4 « deliver() dans apps/api/src/venues/quotes.service.ts » ; « le dépôt numérote déjà tout devis dès la v1, brouillon compris »", "3 × vrai",
         f"deliver {'async deliver(' in _qs}, numéro NOT NULL + statut DRAFT par défaut {bool(re.search(r'^\s*referenceNumber\s+Int\s', _qm, re.M)) and 'QuoteStatus @default(DRAFT)' in _qm}, compteur dans la création {'INSERT INTO quote_number_counters' in _store}",
         "async deliver(" in _qs and bool(re.search(r"^\s*referenceNumber\s+Int\s", _qm, re.M)) and "QuoteStatus @default(DRAFT)" in _qm and "INSERT INTO quote_number_counters" in _store)
_at = lire(FIX, "apps/api/src/auth/auth.types.ts") or ""
_atp = bloc(_at, "export interface AccessTokenPayload {", "}")
_champs = re.findall(r"^\s+(\w+):", _atp or "", re.M)
_env = lire(FIX, "apps/api/src/config/env.ts") or ""
_auth = lire(FIX, "packages/types/src/auth.ts") or ""
_d4 = "Claims du JWT d'accès (D4)" in _at
_prod = "PROD_REQUIRED_EXPLICIT" in _env
_pw = "export const passwordSchema" in _auth
_adm2 = compter(C_FIX, "ADM-2") >= 1
controle("B3-5", "B3", "§ 3 D5 « { sub, role } (D4) », « PROD_REQUIRED_EXPLICIT », « passwordSchema actuel », « ADM-2 » existent", "claims [sub, role] · 4 × vrai",
         f"claims {_champs} · « (D4) » {_d4}, PROD_REQUIRED_EXPLICIT {_prod}, passwordSchema {_pw}, ADM-2 {_adm2}",
         _champs == ["sub", "role"] and _d4 and _prod and _pw and _adm2)
constat("C-7", "§ 3 : les décisions du relecteur sont numérotées « D1 » à « D8 » — **homonymes** des décisions D1 à D8 du registre (« D4 » y est même cité au sens des claims du jeton, D5). "
        f"Précédent : D328 a écrit « **D1. CE CADRAGE COUVRE TOUT… » et « **D2. MÉTHODE… » ({compter(C_FIX, '**D1. CE CADRAGE COUVRE TOUT CE QUE LE LOT CORRECTIF DOIT PORTER')} occurrence). "
        "À l'écriture, les préfixer (« décision 1 du relecteur (D336) ») éviterait qu'une reprise lise « D4 » comme le devis brouillon.")
nv("NV-4", "§ 3 D5 : NIST SP 800-63B-4, § 3.2.10 — hors dépôt.")
_notif = modele(SCHEMA, "Notification") or ""
controle("B3-6", "B3", "§ 3 D7 « notifications », « J-6 » : la table existe (user_id NOT NULL aujourd'hui) ; J-6 est la question du transport WhatsApp", "2 × vrai",
         f"{'@@map(' + chr(34) + 'notifications' + chr(34) + ')' in _notif and bool(re.search(r'^\s*userId\s+String\s+@map', _notif, re.M))}, {present(C_FIX, '- **J-6** — **le transport WhatsApp**')}",
         '@@map("notifications")' in _notif and bool(re.search(r"^\s*userId\s+String\s+@map", _notif, re.M)) and present(C_FIX, "- **J-6** — **le transport WhatsApp**"))

# § 4
_mig = git_grep_fichiers(FIX, "pro_client_records|client_record_id|client_name_ar|client_name_latin|actor_member_id|staff_layer|directory_visible|is_official", "apps/api/prisma")
controle("B4-1", "B4", "§ 4 : les objets du schéma cible n'existent pas encore (`pro_client_records`, `client_record_id`, `client_name_*`, `actor_member_id`, `staff_layer_enabled_at`, `directory_visible`, `is_official`)",
         "0 fichier de `apps/api/prisma`", f"{len(_mig)} fichier(s)", not _mig)
controle("B4-2", "B4", "§ 4 [41] « Le CHECK de forme du numéro (décision 7 de D328) » : la décision 7 de D328 est bien ce `CHECK`, ratifiée comme proposition « à trancher dans L35-4 »", "2 présents",
         f"{present(C_FIX, '(7) **proposer, pour la colonne neuve de la fiche, un `CHECK` de forme**')}, {present(C_FIX, '**(7) ratifiée COMME PROPOSITION, à trancher dans L35-4**')}",
         present(C_FIX, "(7) **proposer, pour la colonne neuve de la fiche, un `CHECK` de forme**") and present(C_FIX, "**(7) ratifiée COMME PROPOSITION, à trancher dans L35-4**"))
# § 4 [L36-2] — les statuts « écrits aujourd'hui »
_quote_ts = lire(FIX, "packages/types/src/quote.ts") or ""
_writable = re.findall(r"QuoteStatus\.(\w+)", bloc(_quote_ts, "export const QUOTE_WRITABLE_STATUSES", "] as const") or "")
_legacy = re.findall(r"QuoteStatus\.(\w+)", bloc(_quote_ts, "export const QUOTE_LEGACY_STATUSES", "] as const") or "")
_trans = lire(FIX, "apps/api/src/venues/quote-transitions.ts") or ""
_cibles = sorted(set(re.findall(r"to: (null|QuoteStatus\.\w+)", bloc(_trans, "export const QUOTE_TRANSITIONS", "};") or "")))
_acc = [l for l in git_grep_lignes(FIX, r"QuoteStatus\.ACCEPTED", "apps/api/src") if est_production(l.split(":", 1)[0])]
_acc_ecrit = [l for l in _acc if not re.search(r"(===|!==)\s*QuoteStatus\.ACCEPTED|^\S+:\d+:\s*(\*|//)", l)]
_jamais = present(_quote_ts, "`ACCEPTED` ne l'a JAMAIS été (vérifié : aucune écriture dans le dépôt)")
_r2 = present(C_FIX, "Le statut `ACCEPTED` d'un devis ne sera écrit que par le paiement en ligne (E3).")
controle("B4-3", "B4", "§ 4 [L36-2] « statuts écrits aujourd'hui : DRAFT, ACCEPTED, CANCELLED » : ces trois statuts sont ÉCRITS par le code aujourd'hui",
         "DRAFT, ACCEPTED, CANCELLED écrits",
         f"cibles des commandes : {_cibles} ; `QuoteStatus.ACCEPTED` en production : {len(_acc)} occurrence(s), {len(_acc_ecrit)} écriture ; quote.ts « ACCEPTED ne l'a JAMAIS été » : {_jamais} ; "
         f"R2 « ne sera écrit que par le paiement en ligne (E3) » : {_r2} ⇒ écrits : DRAFT (défaut de la création) et CANCELLED (`cancel`) ; ACCEPTED : aucun écrivain",
         not (_cibles == ["QuoteStatus.CANCELLED", "null"] and not _acc_ecrit and _jamais and _r2))
controle("B4-4", "B4", "§ 4 [L36-2] « SENT, SUPERSEDED et DECLINED sont LEGACY » ; et la liste « DRAFT, ACCEPTED, CANCELLED » = la constante des statuts que le code a le DROIT d'écrire",
         "legacy [SENT, SUPERSEDED, DECLINED] · inscriptibles [DRAFT, ACCEPTED, CANCELLED]", f"legacy {_legacy} · inscriptibles {_writable}",
         _legacy == ["SENT", "SUPERSEDED", "DECLINED"] and _writable == ["DRAFT", "ACCEPTED", "CANCELLED"])
constat("C-8", "§ 4 [L36-2] : la liste citée est **`QUOTE_WRITABLE_STATUSES`** (« Statuts que le code a encore le DROIT d'ÉCRIRE », `packages/types/src/quote.ts`), pas les statuts écrits ; "
        "le `CHECK` « un devis non officiel n'est jamais accepté » garde son sens (ACCEPTED reste inscriptible, par E3) — c'est la parenthèse qui est fausse, pas la règle.")
_md = present(C_FIX, "*Migration (M-D)*")
_orig = present(C_FIX, "`origin_booking_id`") and present(C_FIX, "`origin_visit_id`")
_uid = bool(re.search(r"^\s*userId\s+String\s+@map", _notif, re.M))
controle("B4-5", "B4", "§ 4 [L35-5] « phone_verified_at (M-D, déjà cadré) », [L35-7] « origin_booking_id et origin_visit_id », [L36-9] « notifications : user_id » NOT NULL aujourd'hui", "3 × vrai",
         f"M-D {_md}, origine {_orig}, user_id NOT NULL {_uid}", _md and _orig and _uid)

# § 5
controle("B5-1", "B5", "§ 5 « le compte fournisseur e-mail (tâche de Ko, déjà au backlog) »", "présent",
         present(B_FIX, "Create the transactional email provider account"), present(B_FIX, "Create the transactional email provider account"))
controle("B5-2", "B5", "§ 5 « NB-1 · ADM-1 · ADM-2 · L35-5 · L35-6 · L35-7 » existent au backlog", "6 présents",
         sum(compter(B_FIX, m) >= 1 for m in ("NB-1", "ADM-1", "ADM-2", "L35-5", "L35-6", "L35-7")),
         all(compter(B_FIX, m) >= 1 for m in ("NB-1", "ADM-1", "ADM-2", "L35-5", "L35-6", "L35-7")))
constat("C-9", f"§ 8 « Entrées OUVERTES … compte fournisseur e-mail ; compte WhatsApp Business » : **les deux existent déjà** (« Create the transactional email provider account », "
        f"« LE COMPTE FOURNISSEUR WHATSAPP — TÂCHE DE KO » : {compter(B_FIX, 'LE COMPTE FOURNISSEUR WHATSAPP — TÂCHE DE KO')} occurrence) — à annoter, pas à recréer.")

# § 6
controle("B6-1", "B6", "§ 6 a) b) c) « M-C », « K-1 … l'exception R4 reste à L35-5 », « K-2 »", "3 × vrai",
         f"{present(C_FIX, '*Migration (M-C)*')}, {present(C_FIX, '**4. L' + chr(39) + 'EXCEPTION R4 est rattachée à L35-5.**')}, {ligne_qui_commence(C_FIX, '- **K-2** ') is not None}",
         present(C_FIX, "*Migration (M-C)*") and present(C_FIX, "**4. L'EXCEPTION R4 est rattachée à L35-5.**") and ligne_qui_commence(C_FIX, "- **K-2** ") is not None)
controle("B6-2", "B6", "§ 6 d) « K-3 inchangé », « DB-11 », « K-3b NEUF » : K-3 et DB-11 existent, K-3b n'existe pas (il est neuf)", "K-3 ✓ · DB-11 ✓ · K-3b 0",
         f"{ligne_qui_commence(C_FIX, '- **K-3** ') is not None} · {ligne_qui_commence(C_FIX, '- **DB-11** —') is not None} · {len(git_grep_fichiers(FIX, r'K-3b', '.'))}",
         ligne_qui_commence(C_FIX, "- **K-3** ") is not None and ligne_qui_commence(C_FIX, "- **DB-11** —") is not None and not git_grep_fichiers(FIX, r"K-3b", "."))
_qcs = bloc(_quote_ts, "export const quoteCreateSchema", "\nexport ")
controle("B6-3", "B6", "§ 6 e) « K-4 amendé : quoteCreateSchema + clientRecordId, clientId retiré (DB-15). K-5 inchangé. » : `clientId` est dans le schéma de création ; DB-15 et K-5 existent", "3 × vrai",
         f"{bool(_qcs and 'clientId: z.string().uuid(' in _qcs)}, {ligne_qui_commence(C_FIX, '- **DB-15** —') is not None}, {ligne_qui_commence(C_FIX, '- **K-5** ') is not None}",
         bool(_qcs and "clientId: z.string().uuid(" in _qcs) and ligne_qui_commence(C_FIX, "- **DB-15** —") is not None and ligne_qui_commence(C_FIX, "- **K-5** ") is not None)
_contrats = bloc(C_FIX, "**Contrats d'API NEUFS — chacun nommé**", "**L'écran du pro (le minimum visible, R4).**")
_k_ids = [int(x) for x in re.findall(r"^- \*\*K-(\d+)\*\*", _contrats or "", re.M)]
_k12 = git_grep_lignes(FIX, r"(^|[^A-Za-z0-9-])K-12([^0-9]|$)", ".")
controle("B6-4", "B6", "§ 6 e) « K-12 : la conversion lit la copie du nom du devis et le numéro/e-mail de la fiche » : un contrat K-12 existe dans le dépôt (la consigne ne le dit pas neuf, contrairement à K-3b et K-13)",
         "K-12 défini", f"table des contrats du cadrage : K-{min(_k_ids)} à K-{max(_k_ids)} ; « K-12 » dans tout l'arbre à {FIX} : {len(_k12)} ligne",
         12 in _k_ids or bool(_k12), f"{len(_k_ids)} contrats")
_qcv = bloc(_quote_ts, "export const quoteConvertSchema", "\nexport ")
_champs_conv = re.findall(r"^\s{4}(\w+):", _qcv or "", re.M)
constat("C-10", f"§ 6 e) : aujourd'hui `POST /quotes/:id/convert` reçoit le contact dans son CORPS (`quoteConvertSchema` : {', '.join(_champs_conv)}) — « la conversion lit … le numéro/e-mail de la fiche » "
        "MODIFIE donc ce contrat (« s'arrêter et demander », `CLAUDE.md`), et ne dit pas ce que devient la conversion d'un devis **sans fiche** : tous les devis existants le seront après la migration "
        "(la base de développement en compte 24 d'après D335, constat X5-C1).")
_phone = lire(FIX, "packages/types/src/phone.ts") or ""
_mes = normaliser_telephones(FIX, {"fixe": "021234567", "etranger": "+33612345678",
                                   "arabo_indien": "٠٥٥٥١٢٣٤٥٦", "mixte": "٠555123456"})
controle("B6-5", "B6", "§ 6 h) « numéro fixe, étranger ou en chiffres arabo-indiens refusé (packages/types/src/phone.ts) » : MESURÉ en exécutant `normalizePhone(\"DZ\", …)` lu à b8ba85a",
         "fixe null · étranger null · arabo-indien null", f"fixe {_mes['fixe']} · étranger {_mes['etranger']} · arabo-indien {_mes['arabo_indien']}",
         _mes["fixe"] is None and _mes["etranger"] is None and _mes["arabo_indien"] is None)
constat("C-11", f"§ 6 h) : un numéro écrit **tout** en chiffres arabo-indiens est refusé (`\\D` les retire, il ne reste rien) ; **un mélange passe** — « ٠555123456 » rend {_mes['mixte']} "
        f"(le chiffre arabo-indien est lu comme de la mise en forme). `phone.ts` ne documente pas ce cas ({len(re.findall('arabo|Arabic-Indic|0660', _phone))} mention).")
controle("B6-6", "B6", "§ 6 i) « e2e du parcours de réservation », « parité FR = AR » : la spec et le test existent", "2 × vrai",
         f"{lire(FIX, 'e2e/specs/r26-parcours-reservation.e2e.ts') is not None}, {lire(FIX, 'apps/api/src/common/i18n-parity.spec.ts') is not None}",
         lire(FIX, "e2e/specs/r26-parcours-reservation.e2e.ts") is not None and lire(FIX, "apps/api/src/common/i18n-parity.spec.ts") is not None)
constat("C-12", "§ 2 d) écrit « K-1 reste inchangé (écran identique pour tout identifiant) », § 6 b) « K-1 amendé : … { phone } OU { email } » — compatible si « inchangé » vise la propriété "
        "(réponse identique), pas l'entrée ; à écrire ainsi.")

# § 7 et § 8
_lignes_ag = A_FIX.split("\n")
controle("B7-1", "B7", "§ 7 « AGENTS.md, lignes 26 et 30 à 32 » : SOLID et patrons", "26 couches · 30 titre · 31 SOLID · 32 pas de sur-abstraction",
         f"{_lignes_ag[25][:22]}… · {_lignes_ag[29]} · {_lignes_ag[30][:22]}… · {_lignes_ag[31][:22]}…",
         _lignes_ag[25].startswith("- Couches : Controller") and _lignes_ag[29] == "## SOLID & patterns" and _lignes_ag[30].startswith("- Respecter SOLID.")
         and _lignes_ag[31].startswith("- NE PAS sur-abstraire."))
controle("B8-1", "B8", "§ 8 « Condition de clôture du rang 33 (nom du client sur le PDF) » : elle est OUVERTE à l'entrée du rang 41", "ouverte",
         "ouverte" if _etat40 and "la **condition de clôture du rang 33** (le nom du client vient avec L35-4)" in _etat40 else "autre",
         bool(_etat40) and "la **condition de clôture du rang 33** (le nom du client vient avec L35-4)" in _etat40)
nv("NV-5", "§ 3 D6 et § 8 : « les ~50 noms de Ko », « les rôles de la salle pilote » — hors dépôt.")


# ── SORTIE ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
print()
print("CONTRÔLES")
print("| id | ce qui est contrôlé | attendu (lu) · mesuré | résultat |")
print("|---|---|---|---|")
for l in controles:
    print(l)
print()
total = sum(v[0] for v in familles.values())
ko = sum(v[1] for v in familles.values())
print("VENTILATION PAR FAMILLE : " + " · ".join(f"{f} {v[0]} ({v[1]} ✗)" for f, v in sorted(familles.items())) + f" — aucune famille à zéro : {all(v[0] for v in familles.values())}")
print()
print(f"ÉCARTS DE D335 : {len(ecarts_d335)} {ecarts_d335}")
print(f"ÉCARTS DE L'ÉTAT VIVANT : {len(ecarts_live)} {ecarts_live}")
print(f"ÉCARTS DE LA CONSIGNE (affirmations fausses contre le dépôt) : {len(ecarts_consigne)} {ecarts_consigne}")
print()
print(f"CONSTATS ({len(constats)})")
for l in constats:
    print(l)
print()
print(f"NON VÉRIFIABLES ({len(non_verifiables)})")
for l in non_verifiables:
    print(l)
print()
print(f"BILAN : {total} contrôles — {total - ko} ✓ · {ko} ✗ (D335 {len(ecarts_d335)} · état vivant {len(ecarts_live)} · consigne {len(ecarts_consigne)}) · {len(constats)} constats · "
      f"{len(non_verifiables)} non vérifiables · calibration {bras[0]} bras, {bras[1]} manqué")
if ecarts_consigne:
    print("RÈGLE D'ARRÊT DÉCLENCHÉE (consigne, section 0) : « Si une affirmation de ce message est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. »")
    sys.exit(3)
sys.exit(1 if (ecarts_d335 or ecarts_live) else 0)
