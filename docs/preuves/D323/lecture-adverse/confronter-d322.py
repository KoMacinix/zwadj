"""D323 — lecture adverse de D322 (rang 30, lot de code), confrontée aux objets git à des SHA FIXÉS.

POURQUOI IL EXISTE
  La forme de Ko au rang 31 : « lecture adverse depuis la clôture de D322, en entier, et EN ENTIER dans le rapport final ».
  Le dernier commit est celui de D322 (`0e7a9f2`, parent `5a362d7`) ; aucun commit ne le suit. Chaque affirmation de D322 qui
  se vérifie dans le dépôt est confrontée à sa SOURCE : provenance, borne de D316, portes, campagnes, rouges, relevés,
  captures, mesures, passe D277, audits, lecture adverse de D321, ordre et registre. Une affirmation qui ne vit que dans le
  chat est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D323/lecture-adverse/confronter-d322.py > docs/preuves/D323/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF la
  famille X, qui lit l'arbre de travail PRÉCISÉMENT parce que c'est lui qui dit ce que la session a reçu (`git status`,
  `git diff`) ; ses lignes s'impriment sous un intitulé qui le dit. AUCUN rejeu de harnais : `neutralize-r30.py` cible
  `edit-venue-page.tsx`, que l'arbre de travail modifie — le rejouer mesurerait un arbre qui n'est pas celui du commit.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d321.py` (D322) — il juge D321, pas D322 ; une lecture « à l'œil » des sections — elle
  rate les chiffres et les sources (D320, écart 9 ; D322, écart C6).

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est
  connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils ont PARCOURU et leur attendu à côté (D290),
  et le total des contrôles avec sa ventilation par famille (D295).
"""
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

D322 = "0e7a9f2"   # commit de D322
AVANT = "5a362d7"  # SHA de départ déclaré par D322 (commit de D321)
PREUVES = "docs/preuves/D322"
ANSI = re.compile(r"\x1b\[[0-9;]*m")

controles, ecarts, constats, ecarts_arbre = [], [], [], []
familles: dict[str, int] = {}


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show(sha, chemin):
    return git("show", f"{sha}:{chemin}").decode("utf-8").replace("\r\n", "\n")


def show_octets(sha, chemin):
    return git("show", f"{sha}:{chemin}")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_arbre if ident[0] == "X" else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:5} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:5} CONSTAT : {texte}")


def aplati(t):
    return re.sub(r"\s+", " ", t)


def section(sha, titre_debut):
    t = show(sha, "ZWADJ_CONTINUITE.md")
    debut = t.index(titre_debut)
    fin = t.index("\n## ", debut + 10)
    return t[debut:fin]


# ── Extracteurs (chacun calibré plus bas)
def resume_vitest(texte):
    """Les paires (fichiers, tests) des résumés vitest, dans l'ordre — codes ANSI retirés (D275)."""
    t = ANSI.sub("", texte)
    fichiers = [int(m) for m in re.findall(r"Test Files\s+(\d+) passed", t)]
    tests = [int(m) for m in re.findall(r"^\s+Tests\s+(\d+) passed", t, flags=re.M)]
    return list(zip(fichiers, tests))


def code_porte(texte, nom):
    m = re.search(rf"^{re.escape(nom)} code=(\d+) durée=(\d+)s", texte, flags=re.M)
    return (int(m.group(1)), int(m.group(2))) if m else None


def tests_de(texte, fichier):
    m = re.search(rf"✓ {re.escape(fichier)} \((\d+) tests?\)", ANSI.sub("", texte))
    return int(m.group(1)) if m else None


def bilan_campagne(texte):
    """(mordues, jouées, non_mesurées, code, durée) — lus sur les lignes de bilan du harnais."""
    m = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) jouée\(s\) · (\d+) non mesurée", texte)
    c = re.search(r"^campagne \S+ code=(\d+) durée=(\d+)s", texte, flags=re.M)
    if not m or not c:
        return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3)), int(c.group(1)), int(c.group(2))


def detail_par_cible(texte):
    """{identifiant de cible: ligne de détail qui suit sa ligne ✓} — chaque cible MORDUE ouvre par `✓ <id>.`."""
    lignes = texte.split("\n")
    sortie = {}
    for i, l in enumerate(lignes):
        m = re.match(r"^✓ ([A-Z]\d+-[A-Z0-9]+)\.", l)
        if m and i + 1 < len(lignes):
            sortie[m.group(1)] = lignes[i + 1]
    return sortie


def fichiers_attendus(sect):
    """Les chemins de la première colonne de la table « Fichiers attendus », lignes BARRÉES exclues, `*(neuf)*` ôté."""
    debut = sect.index("#### Fichiers attendus")
    fin = sect.index("⚠ Toute extension de cette table", debut)
    sortie = set()
    for l in sect[debut:fin].split("\n"):
        m = re.match(r"^\| (~~)?`([^`]+)`", l)
        if m and not m.group(1):
            sortie.add(m.group(2))
    return sortie


def jour_semaine_js(annee, mois, jour):
    """0 = dimanche … 6 = samedi (convention JS/API, D56)."""
    return (datetime.date(annee, mois, jour).weekday() + 1) % 7


def weekend_days(texte):
    """La liste littérale de `WEEKEND_DAYS` (déclaration typée comprise : `WEEKEND_DAYS: readonly number[] = [5, 6]`)."""
    m = re.search(r"WEEKEND_DAYS[^=\n]*=\s*\[([0-9, ]+)\]", texte)
    return [int(x) for x in m.group(1).split(",")] if m else None


def feuilles(obj):
    if isinstance(obj, dict):
        return sum(feuilles(v) for v in obj.values())
    return 1


def resoudre(obj, chemin):
    for k in chemin.split("."):
        if not isinstance(obj, dict) or k not in obj:
            return None
        obj = obj[k]
    return obj


# ══ CALIBRATION — deux bras par extracteur ; abandon si un seul manque ═════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("vitest, résumé positif (ANSI, 2 fichiers)",
     resume_vitest("\x1b[2m Test Files \x1b[22m \x1b[1m\x1b[32m59 passed\x1b[39m (59)\n      Tests  667 passed (667)\n"), [(59, 667)])
bras("vitest, négatif (échec : aucun « passed » en tête de ligne)", resume_vitest(" Test Files  1 failed (1)\n      Tests  1 failed (1)\n"), [])
bras("code_porte, positif", code_porte("x\ntest code=0 durée=75s\n", "test"), (0, 75))
bras("code_porte, négatif (autre porte)", code_porte("lint code=0 durée=14s\n", "test"), None)
bras("tests_de, positif", tests_de(" ✓ src/a.test.tsx (11 tests) 99ms", "src/a.test.tsx"), 11)
bras("tests_de, négatif (✗)", tests_de(" ✗ src/a.test.tsx (11 tests) 99ms", "src/a.test.tsx"), None)
bras("bilan_campagne, positif",
     bilan_campagne("8 garde(s) mordue(s) sur 8 cible(s) jouée(s) · 0 non mesurée(s) (attendu : 8 sur 8)\ncampagne r30 code=0 durée=66s"),
     (8, 8, 0, 0, 66))
bras("bilan_campagne, négatif (7 sur 8)",
     bilan_campagne("7 garde(s) mordue(s) sur 8 cible(s) jouée(s) · 1 non mesurée(s)\ncampagne r30 code=3 durée=9s"), (7, 8, 1, 3, 9))
bras("detail_par_cible, positif", detail_par_cible("✓ R30-1. x\n   ancre 1→0 · AssertionError: y\n"), {"R30-1": "   ancre 1→0 · AssertionError: y"})
bras("detail_par_cible, négatif (cible non mordue : « ✗ »)", detail_par_cible("✗ R30-1. x\n   ancre\n"), {})
_t = ("| fichier | pour |\n|---|---|\n| `a.md` | x |\n| ~~`b.ts` *(neuf)*~~ | y |\n| `c.py` *(neuf)* | z |\n")
bras("fichiers_attendus, positif/négatif (barré exclu, `(neuf)` ôté)",
     fichiers_attendus("#### Fichiers attendus\n" + _t + "\n⚠ Toute extension de cette table"), {"a.md", "c.py"})
bras("jour_semaine_js, positif (6 août 2027 = vendredi = 5)", jour_semaine_js(2027, 8, 6), 5)
bras("jour_semaine_js, négatif (1 août 2027 = dimanche = 0, et ≠ 5)", jour_semaine_js(2027, 8, 1), 0)
bras("resoudre, positif", resoudre({"a": {"b": "x"}}, "a.b"), "x")
bras("resoudre, négatif (chemin absent)", resoudre({"a": {"b": "x"}}, "a.c"), None)
bras("feuilles, positif", feuilles({"a": {"b": 1, "c": 2}, "d": 3}), 3)
bras("feuilles, négatif (≠ nombre de clés de tête)", feuilles({"a": {"b": 1}}) == 1, True)
bras("weekend_days, positif (déclaration typée)", weekend_days("export const WEEKEND_DAYS: readonly number[] = [5, 6];"), [5, 6])
bras("weekend_days, négatif (aucune déclaration)", weekend_days("export const isWeekend = (d) => true;"), None)
print(f"   calibration : {len(cal)} bras · {cal.count(False)} manqué(s) (attendu 0)")
if False in cal:
    sys.exit("calibration manquée : l'instrument est faux, abandon avant tout contrôle (D286)")
print()

# ══ P — provenance ════════════════════════════════════════════════════════════════════════════════════════════════════
print("== P — provenance (objets git)")
S = section(D322, "## Session du 02/10/2026 — D322")
POINT = section(D322, "## ~~PROCHAIN LOT~~ — rang 30")
parent = git("rev-parse", f"{D322}^").decode().strip()
ctl("P1", "le parent du commit de D322 est le SHA de départ déclaré", AVANT, parent[:7])
fichiers = [f for f in git("diff", "--name-only", AVANT, D322).decode("utf-8").split("\n") if f]
hors_preuves = {f for f in fichiers if not f.startswith(PREUVES + "/")}
attendus = fichiers_attendus(POINT)
ctl("P2", "les fichiers du commit hors `docs/preuves/D322/` sont EXACTEMENT ceux de la table d'ouverture (dérivée du texte)",
    sorted(attendus), sorted(hors_preuves))
print(f"      ({len(fichiers)} fichiers au commit · {len(hors_preuves)} hors pièces · {len(attendus)} dans la table, lignes barrées exclues)")
ctl("P3", "la spec e2e du lien n'est PAS dans `e2e/specs/` à `0e7a9f2` (barrée de la table) et sa copie versée existe",
    (False, True), (existe(D322, "e2e/specs/r30-lien-calendrier-pro.e2e.ts"), existe(D322, f"{PREUVES}/navigateur/r30-lien-calendrier-pro.e2e.ts")))
ctl("P4", "aucune migration, aucun `schema.prisma`, aucun fichier de l'API dans le diff (lot sans chemin de l'argent)",
    [], [f for f in fichiers if f.startswith("apps/api/")])
print()

# ══ B — borne de D316 ═════════════════════════════════════════════════════════════════════════════════════════════════
print("== B — borne de D316 (la date choisie et son transport vers le calcul du prix)")
PANNEAU = "apps/client/src/components/venue/booking-request-panel.tsx"
CAL = "apps/client/src/lib/booking-calendar.ts"
PICKER = "apps/client/src/components/venue/booking-date-picker.tsx"
for i, f in enumerate((PANNEAU, CAL, PICKER), 1):
    ctl(f"B{i}", f"`{f.split('/')[-1]}` identique entre `{AVANT}` et `{D322}` (octets)", git("rev-parse", f"{AVANT}:{f}"), git("rev-parse", f"{D322}:{f}"))
ctl("B4", "le diff du code produit du lot se réduit à `edit-venue-page.tsx`",
    ["apps/pro/src/venues/edit-venue-page.tsx"],
    [f for f in fichiers if f.startswith("apps/") and not f.endswith((".test.tsx", ".test.ts"))])
dep = git("diff", "-U0", AVANT, D322, "--", "apps/pro/src/venues/edit-venue-page.tsx").decode("utf-8")
ajoutees = [l[1:].strip() for l in dep.split("\n") if l.startswith("+") and not l.startswith("+++")]
code_ajoute = [l for l in ajoutees if l and not l.startswith(("{/*", "⚠", "COURANTE", "montrerait", "déclarée", "sélectionne"))]
ctl("B5", "D322 : « un lien et une sélection » — les lignes de CODE ajoutées à `edit-venue-page.tsx` sont l'import, le hook et le lien",
    3, len([l for l in ajoutees if l.startswith(("import { useProVenues }", "const { select: selectVenue }", "<Link to=\"/calendrier\""))]))
print(f"      ({len(ajoutees)} lignes ajoutées au total, commentaires compris)")
print()

# ══ G — portes ════════════════════════════════════════════════════════════════════════════════════════════════════════
print("== G — portes (extraits versés à `0e7a9f2`, passe 2)")
P = f"{PREUVES}/portes"
tc = show(D322, f"{P}/typecheck.txt")
li = show(D322, f"{P}/lint.txt")
te = show(D322, f"{P}/test.txt")
bu = show(D322, f"{P}/build.txt")
ti = show(D322, f"{P}/test-int.txt")
e2 = ANSI.sub("", show(D322, f"{P}/test-e2e.txt"))
ctl("G1", "typecheck : code 0, durée 19 s, 8 « Done », 0 `error TS`", (0, 19, 8, 0),
    (*code_porte(tc, "typecheck"), len(re.findall(r": Done$", tc, flags=re.M)), len(re.findall(r"error TS", tc))))
ctl("G2", "lint : code 0, durée 14 s, 8 « Done »", (0, 14, 8), (*code_porte(li, "lint"), len(re.findall(r": Done$", li, flags=re.M))))
ctl("G3", "test : code 0, durée 75 s", (0, 75), code_porte(te, "test"))
ctl("G4", "test : les quatre résumés vitest (API, api-client, client, pro) — fichiers/tests",
    [(59, 667), (4, 39), (25, 344), (30, 352)], resume_vitest(te))
ctl("G5", "build : code 0, durée 39 s, 4 « Done »", (0, 39, 4), (*code_porte(bu, "build"), len(re.findall(r": Done$", bu, flags=re.M))))
ctl("G6", "build : l'avertissement `outputFileTracingRoot` est dans l'extrait (partie A de D322)", True,
    "outputFileTracingRoot" in bu and "multiple lockfiles" in bu)
ctl("G7", "test:int : code 0, durée 339 s, 36 fichiers, 444 tests", (0, 339, [(36, 444)]),
    (*code_porte(ti, "test:int"), resume_vitest(ti)))
ctl("G8", "test:int : « DEUX demandes concurrentes … coexistent en PENDING » est vert (✓)", 1,
    len(re.findall(r"✓ .*DEUX demandes concurrentes sur la même date coexistent en PENDING", ANSI.sub("", ti))))
ctl("G9", "e2e : code 0, durée 158 s, 43 réussis, 1 ignoré", (0, 158, 43, 1),
    (*code_porte(e2, "test:e2e"), int(re.search(r"(\d+) passed", e2).group(1)), int(re.search(r"(\d+) skipped", e2).group(1))))
ctl("G10", "e2e : 0 « File change detected », 1 « successfully started » (l'API n'a pas redémarré, D317)", (0, 1),
    (len(re.findall(r"File change detected", e2)), len(re.findall(r"successfully started", e2))))
ctl("G11", "les deux tests neufs : 11 tests (sélecteur de date) et 3 tests (lien) dans `test.txt`", (11, 3),
    (tests_de(te, "src/components/venue/booking-date-picker.test.tsx"), tests_de(te, "src/venues/calendar-link.test.tsx")))
d321_te = show(AVANT, "docs/preuves/D321/portes/test.txt")
ant = resume_vitest(d321_te)
ctl("G12", "les deltas annoncés « +11/+1 » (client) et « +3/+1 » (pro) = résumé de D321 → résumé de D322",
    [(11, 1), (3, 1)], [(resume_vitest(te)[2][1] - ant[2][1], resume_vitest(te)[2][0] - ant[2][0]),
                        (resume_vitest(te)[3][1] - ant[3][1], resume_vitest(te)[3][0] - ant[3][0])])
print(f"      (résumés de D321 lus : {ant})")
p1 = {n: show(D322, f"{P}/passe1/{n}") for n in ("typecheck.txt", "lint.txt", "build.txt", "test.txt", "test-int.txt")}
ctl("G13", "passe 1 : typecheck 0 (19 s), lint 0 (14 s), test 0 (78 s), build 0 (40 s), test:int 0 (344 s)",
    [(0, 19), (0, 14), (0, 78), (0, 40), (0, 344)],
    [code_porte(p1["typecheck.txt"], "typecheck"), code_porte(p1["lint.txt"], "lint"), code_porte(p1["test.txt"], "test"),
     code_porte(p1["build.txt"], "build"), code_porte(p1["test-int.txt"], "test:int")])
ctl("G14", "passe 1 : test:int 444/36, test 667/59 · 39/4 · 344/25 · 352/30 (« mêmes comptes »)",
    ([(36, 444)], [(59, 667), (4, 39), (25, 344), (30, 352)]), (resume_vitest(p1["test-int.txt"]), resume_vitest(p1["test.txt"])))
echecs = [ANSI.sub("", show(D322, f"{P}/passe1/test-e2e-echec-{i}.txt")) for i in (1, 2)]
ctl("G15", "passe 1 : deux échecs e2e, durées 152 s et 143 s",
    [152, 143], [int(re.search(r"durée=(\d+)s", re.sub(r"^# .*$", "", e, flags=re.M) + "durée=0s").group(1)) if "durée=" in e else None for e in echecs])
print()

# ══ N — campagnes ═════════════════════════════════════════════════════════════════════════════════════════════════════
print("== N — campagnes (journaux versés à `0e7a9f2`)")
NEU = f"{PREUVES}/neutralisation"
r30 = show(D322, f"{NEU}/campagne-r30.log")
r30p1 = show(D322, f"{NEU}/campagne-r30-passe1.log")
r29 = show(D322, f"{NEU}/campagne-r29.log")
r25 = show(D322, f"{NEU}/campagne-r25.txt")
r26 = show(D322, f"{NEU}/campagne-r26.txt")
ctl("N1", "r30, passe 2 : 8 mordues sur 8, 0 non mesurée, code 0, 66 s", (8, 8, 0, 0, 66), bilan_campagne(r30))
m_p1 = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) jouée\(s\) · (\d+) non mesurée", r30p1)
ctl("N1b", "r30, passe 1 : « 8 sur 8 » ET « 66 s chacune » (D322) — la pièce porte-t-elle la durée de la passe 1 ?",
    ((8, 8, 0), 66), (tuple(int(x) for x in m_p1.groups()),
                      (int(re.search(r"^campagne \S+ code=\d+ durée=(\d+)s", r30p1, flags=re.M).group(1))
                       if re.search(r"^campagne \S+ code=\d+ durée=(\d+)s", r30p1, flags=re.M) else None)))
d30 = detail_par_cible(r30)
ctl("N2", "r30 : les 8 cibles sont mordues et chacune est LUE en `AssertionError`", (8, 8),
    (len(d30), sum(1 for v in d30.values() if "AssertionError" in v)))
d29 = detail_par_cible(r29)
ctl("N3", "r29 : 15 sur 15, code 0, 142 s ; 15 cibles, toutes en `AssertionError`", ((15, 15, 0, 0, 142), (15, 15)),
    (bilan_campagne(r29), (len(d29), sum(1 for v in d29.values() if "AssertionError" in v))))
d25 = detail_par_cible(r25)
ctl("N4", "r25 : 10 sur 10 jouées, 1 non mesurée, code 3, 519 s", (10, 10, 1, 3, 519), bilan_campagne(r25))
ctl("N5", "r25 : « 7 en `AssertionError`, 3 par bloc `expect(` » (D322)", (10, 7, 3),
    (len(d25), sum(1 for v in d25.values() if "AssertionError" in v), sum(1 for v in d25.values() if "AssertionError" not in v and "Error:" in v)))
d26 = detail_par_cible(r26)
ctl("N6", "r26 : 4 sur 4, code 0, 465 s ; aucune des 4 n'est en `AssertionError` (bloc `expect(`/Error)", ((4, 4, 0, 0, 465), (4, 0)),
    (bilan_campagne(r26), (len(d26), sum(1 for v in d26.values() if "AssertionError" in v))))
ctl("N7", "r26 : l'expiration d'une assertion à réessai (`Timed out 7000ms waiting for expect(`) est dans R26-2 ET R26-4 — et dans elles seules",
    ["R26-2", "R26-4"], sorted(k for k, v in d26.items() if "Timed out 7000ms waiting for expect(" in v))
ctl("N8", "r26 : R26-1 et R26-3 mordent par un `Error:` d'assertion maison (« le pro/client ne voit pas… »), PAS par une expiration",
    [True, True], [bool(re.search(r"Error: le pro ne voit pas la demande", d26["R26-1"])) and "Timed out" not in d26["R26-1"],
                    bool(re.search(r"Error: le client ne voit pas", d26["R26-3"])) and "Timed out" not in d26["R26-3"]])
ctl("N9", "les empreintes de départ/arrivée : r30 4 fichiers, r29 7 fichiers, 0 différent",
    [("4", "0"), ("7", "0")], [re.search(r"empreintes : (\d+) fichier\(s\) ciblé\(s\) comparé\(s\) au départ · (\d+) différent", t).groups() for t in (r30, r29)])
ctl("N10", "journaux copiés : r30 10, r29 20, r25 10, r26 5 (les nombres de D322)", (10, 20, 10, 5),
    tuple(len([f for f in git("ls-tree", "-r", "--name-only", D322, f"{NEU}/{d}/").decode("utf-8").split("\n") if f]) for d in ("r30", "r29", "r25", "r26")))
liste = show(D322, f"{PREUVES}/mesures/lancer-campagnes-liste.txt")
m = re.search(r"(\d+) fichier\(s\) modifié\(s\) depuis HEAD → (\d+) campagne\(s\) concernée\(s\) sur (\d+)", liste)
ctl("N11", "le tri : « 1 campagne concernée sur 32 » = `r30`, par `edit-venue-page.tsx`",
    (1, 32, True), (int(m.group(2)), int(m.group(3)), "neutralize-r30.py" in liste and "edit-venue-page.tsx" in liste))
ctl("N12", "les 32 de « sur 32 » = les `neutralize-*.py` présents à `0e7a9f2` (autorité : `git ls-tree`)", 32,
    len([f for f in git("ls-tree", "--name-only", D322, "neutralisation/").decode("utf-8").split("\n") if re.search(r"neutralize-.*\.py$", f)]))
print(f"      (le tri affiche « {m.group(1)} fichier(s) modifié(s) depuis HEAD » : aucun commit ne le rend vérifiable après coup — "
      "mesuré sur l'arbre de travail du moment)")
print()

# ══ R — rouges lus ════════════════════════════════════════════════════════════════════════════════════════════════════
print("== R — les rouges que D322 cite, mot pour mot")
ctl("R1", "R30-3 : « expected 'أغسطس 2027' to be 'août 2027' »", True, "expected 'أغسطس 2027' to be 'août 2027'" in d30["R30-3"])
ctl("R2", "R30-6 : « expected [ 1, 6, 8, 13, 15, 20, 22, 27, 29 ] to deeply equal [] »", True,
    "expected [ 1, 6, 8, 13, 15, 20, 22, 27, 29 ] to deeply equal []" in d30["R30-6"])
wk = weekend_days(show(D322, "apps/client/src/lib/calendar.ts"))
vue_mutee = [6, 0]  # samedi-dimanche, la convention CLDR que la neutralisation R30-6 pose
attendu_jours = [j for j in range(1, 32) if (jour_semaine_js(2027, 8, j) in wk) != (jour_semaine_js(2027, 8, j) in vue_mutee)]
ctl("R3", "R30-6 : la liste du rouge = les jours d'août 2027 où `WEEKEND_DAYS` (autorité) et samedi-dimanche DIFFÈRENT (dérivée du calendrier)",
    attendu_jours, [1, 6, 8, 13, 15, 20, 22, 27, 29])
ctl("R4", "R30-7 : « expected 'Nouvelle réservation' to be 'Calendrier de la salle' » ; R30-8 : « expected 'v1' to be 'v2' »", (True, True),
    ("expected 'Nouvelle réservation' to be 'Calendrier de la salle'" in d30["R30-7"], "expected 'v1' to be 'v2'" in d30["R30-8"]))
ru = show(D322, f"{PREUVES}/rouges/K-rouge-unitaire.txt")
ctl("R5", "rouge unitaire du lien : les deux messages dans `K-rouge-unitaire.txt` ; vert : 3/3", (True, True, [(1, 3)]),
    ("expected 'Nouvelle réservation' to be 'Calendrier de la salle'" in ru, "expected 'v1' to be 'v2'" in ru,
     resume_vitest(show(D322, f"{PREUVES}/rouges/K-vert-unitaire.txt"))))
nav = show(D322, f"{PREUVES}/navigateur/K-a-rouge-e2e.txt")
ctl("R6", "rouge navigateur : « Expected … :5273/calendrier » / « Received … :5273/ »", True,
    'Expected string: "http://localhost:5273/calendrier"' in nav and 'Received string: "http://localhost:5273/"' in nav)
vert = ANSI.sub("", show(D322, f"{PREUVES}/navigateur/K-a-vert-e2e.txt"))
ctl("R7", "vert navigateur : la spec du lien est « ok », aucune ligne « x », « 2 passed » (la spec et le préchauffage)",
    (1, 0, "2 passed"),
    (len(re.findall(r"^\s+ok \d+ \[chromium\] › specs\\r30-lien-calendrier-pro", vert, flags=re.M)),
     len(re.findall(r"^\s+x \d+ ", vert, flags=re.M)), re.search(r"(\d+ passed)", vert).group(1)))
print()

# ══ K — la spec du lien, `fetch failed`, mesures ══════════════════════════════════════════════════════════════════════
print("== K — la spec du lien hors de la suite, `fetch failed` (D265), mesures")
spec_versee = show_octets(D322, f"{PREUVES}/navigateur/r30-lien-calendrier-pro.e2e.ts")
ctl("K1", "l'empreinte `2f11ca72…` de D322 est celle des octets VERSÉS (CRLF) ; la version LF a une AUTRE empreinte",
    ("2f11ca72", True, "9e5ba7a2"),
    (hashlib.sha256(spec_versee).hexdigest()[:8], b"\r\n" in spec_versee, hashlib.sha256(spec_versee.replace(b"\r\n", b"\n")).hexdigest()[:8]))
constat("K7", "D322 écrit « empreinte 2f11ca72… avant et après le déplacement » ET « les deux passes ont lu sa version en LF, normalisée en CRLF "
        "ensuite » : 2f11ca72… est l'empreinte des octets CRLF versés ; la version LF qui a produit les deux lectures (9e5ba7a2…, calculée ici) "
        "n'est portée par AUCUNE pièce. « Même contenu » est exact (LF et CRLF ne diffèrent que par les fins de ligne) ; « avant et après » "
        "ne peut pas valoir pour les mêmes octets. Annotation, pas un défaut de comportement.")
cr = [bool(re.search(r"a échoué après (4|7) ms", e)) and "TypeError: fetch failed" in e and "ECONNRESET" in e for e in echecs]
ctl("K2", "les deux échecs de la passe 1 : « après 4 ms » / « après 7 ms », chaîne `fetch failed` ← `ECONNRESET`", ([True, True], ["4", "7"]),
    (cr, [re.search(r"a échoué après (\d+) ms", e).group(1) for e in echecs]))
ctl("K3", "mesures du semis : « 5,2 à 5,4 s » = les trois durées versées", "5.2-5.4",
    "%.1f-%.1f" % (min(int(x) for x in re.findall(r"· (\d+) ms", show(D322, f"{PREUVES}/mesures/duree-semis.txt"))) / 1000,
                   max(int(x) for x in re.findall(r"· (\d+) ms", show(D322, f"{PREUVES}/mesures/duree-semis.txt"))) / 1000))
fen = show(D322, f"{PREUVES}/mesures/repro-keepalive-fenetre.txt")
ctl("K4", "« 0 échec sur 33 essais de 4,6 à 5,6 s » : 33 essais parcourus, 0 échec, fenêtre 4600–5600 ms", (33, 0, 4600, 5600),
    (int(re.search(r"(\d+) essais parcourus", fen).group(1)), int(re.search(r"(\d+) échec", fen).group(1)),
     min(int(x) for x in re.findall(r"blocage (\d+) ms", fen)), max(int(x) for x in re.findall(r"blocage (\d+) ms", fen))))
rk = show(D322, f"{PREUVES}/mesures/repro-keepalive.txt")
ctl("K5", "le montage isolé : 4 bras, le bras A (blocage 7 s) ne produit PAS d'échec — « NON reproduite »", (4, 1, True),
    (int(re.search(r"(\d+) bras", rk).group(1)), int(re.search(r"(\d+) manqué", rk).group(1)), "✗ bras A" in rk and "succès 200" in rk.split("bras A")[1].split("\n")[0]))
constat("K6", "le montage isolé n'a PAS son bras positif : le bras A, seul bras censé échouer si l'hypothèse « socket keep-alive réutilisée "
        "après un blocage » était vraie, rend « succès » — la sortie imprime « 1 manqué(s) (attendu 0) ». D322 en tire « NON reproduite » ; "
        "c'est exact, mais une hypothèse non reproduite dans un montage qui n'a pas montré qu'il savait la reproduire n'est pas ÉCARTÉE — "
        "elle reste ouverte (D322 dit « cause inconnue »). Pas un écart de D322 : un cadrage pour la décision (c) de Ko.")
print()

# ══ C — captures ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== C — captures (relevé versé, images par leur taille git)")
rel = show(D322, f"{PREUVES}/captures/releve.txt")
hauteurs = [int(h) for h in re.findall(r"hauteur (\d+) px", rel)]
ctl("C1", "FR anonyme 1280 px : 4 858 ; FR connecté : 5 629", (4858, 5629), (hauteurs[0], hauteurs[-1]))
d321_rel = show(AVANT, "docs/preuves/D321/captures/releve.txt")
h321 = [int(h) for h in re.findall(r"hauteur (\d+) px", d321_rel)]
ctl("C2", "« les deux hauteurs baissent de 92 px » = D321 (4 950 ; 5 721) − D322 (4 858 ; 5 629), tiré des deux relevés", (92, 92),
    (h321[0] - hauteurs[0], h321[-1] - hauteurs[-1]))
print(f"      (hauteurs D321 : {h321} · D322 : {hauteurs} — {len(h321)} et {len(hauteurs)} mesures parcourues)")
baisse_360 = [h321[2] - hauteurs[2], h321[3] - hauteurs[3]]
constat("C7", f"D322 dit « les deux hauteurs baissent de 92 px » (celles à 1280 px). Les deux hauteurs à 360 px (FR, AR) baissent AUSSI, "
        f"de {baisse_360} px — non mentionné ; même cause non attribuée (aucun code produit du client n'a changé dans ce lot). "
        f"Les cinq mesures parcourues de chaque côté sont imprimées ci-dessus.")
boutons = re.findall(r"M5/M6 · (fiche [^:]*) : hauteur \d+ px · largeur \d+ px pour une fenêtre de \d+ px · débordement \S+ · boutons du panneau (\d+)", rel)
ctl("C3", "boutons du panneau : 33 partout, 35 sur la SEULE ligne « connecté, un jour et un créneau choisis » ; à 360 px : FR 364 px OUI, AR 360 px non",
    ({"fiche FR, connecté, un jour et un créneau choisis": 35}, 4, ("364", "OUI"), ("360", "non")),
    ({n: int(b) for n, b in boutons if int(b) != 33}, len([1 for _, b in boutons if int(b) == 33]),
     re.search(r"fiche FR, anonyme, 360 px.*?largeur (\d+) px.*?débordement (OUI|non)", rel).groups(),
     re.search(r"fiche AR, anonyme, 360 px.*?largeur (\d+) px.*?débordement (OUI|non)", rel).groups()))
ctl("C4", "M7 : FR « 15 latins, 0 arabe » ; AR (1280 et 360) « 0 latin, 15 arabes » ; M8 : colonnes [5,6] partout",
    (["latins 15, arabes 0", "latins 0, arabes 15", "latins 0, arabes 15"], 3),
    (re.findall(r"textes 15 : (latins \d+, arabes \d+)", rel), len(re.findall(r"colonnes mises en avant \[5,6\]", rel))))
tailles = dict(re.findall(r"CAPTURE (\S+\.jpg) .* · (\d+) octets", rel))
reel = {n: int(git("cat-file", "-s", f"{D322}:{PREUVES}/captures/images/{n}").decode()) for n in tailles}
ctl("C5", "les 8 images : la taille imprimée au relevé = la taille de l'objet git", {n: int(v) for n, v in tailles.items()}, reel)
ctl("C6", "« FIN · 8 capture(s) tentée(s) » ; 8 images versées", (True, 8),
    ("FIN · 8 capture(s) tentée(s)" in rel, len([f for f in git("ls-tree", "-r", "--name-only", D322, f"{PREUVES}/captures/images/").decode().split("\n") if f.endswith(".jpg")])))
print()

# ══ D — passe D277 ════════════════════════════════════════════════════════════════════════════════════════════════════
print("== D — passe D277 (les deux sens)")
bal = show_octets(D322, f"{PREUVES}/passe-d277/balayage.py")
ctl("D1", "l'instrument est la copie à l'octet de celui de D306 à D321 (`24802faf…` en sha256, version LF)", "24802faf",
    hashlib.sha256(bal.replace(b"\r\n", b"\n")).hexdigest()[:8])
ctl("D2", "même objet git que celui de D321 (instrument inchangé)", git("rev-parse", f"{AVANT}:docs/preuves/D321/passe-d277/balayage.py"),
    git("rev-parse", f"{D322}:{PREUVES}/passe-d277/balayage.py"))
mot = show(D322, f"{PREUVES}/passe-d277/motifs.txt")
mots = [l for l in mot.split("\n") if l and not l.startswith("#")]
ctl("D3", "motifs : 21 + 2 témoins (T+, T-)", (21, 2),
    (len([l for l in mots if l[0] in "12" and l[1] == "|"]), len([l for l in mots if l.startswith(("T+|", "T-|"))])))
ap = show(D322, f"{PREUVES}/passe-d277/balayage-apres-ecriture.txt")
co = show(D322, f"{PREUVES}/passe-d277/balayage-controle.txt")
ctl("D4", "le contrôle rejoué sur l'état qui part rend les MÊMES lignes que la passe « après écriture » (lignes de comptes)",
    [l for l in ap.split("\n") if l.startswith("[sens") or l.startswith("OCCURRENCES") or l.startswith("MOTIFS")],
    [l for l in co.split("\n") if l.startswith("[sens") or l.startswith("OCCURRENCES") or l.startswith("MOTIFS")])
zero = re.search(r"MOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", co)
print(f"      (contrôle : {len(co.split(chr(10)))} lignes parcourues ; « MOTIFS À ZÉRO » = {zero.group(1) if zero else '?'} — D322 : un motif à zéro est une hypothèse, pas une absence)")
print()

# ══ A — audits ════════════════════════════════════════════════════════════════════════════════════════════════════════
print("== A — audits de secrets")
cook = show(D322, f"{PREUVES}/controles/aucun-cookie-reel.txt")
val = show(D322, f"{PREUVES}/controles/aucune-valeur-reelle.txt")
ctl("A1", "les deux contrôles dédiés : « porteurs : 0 (attendu 0) » sur 109 fichiers", (True, True, 109),
    ("porteurs : 0 (attendu 0)" in cook, "porteurs : 0 (attendu 0)" in val, int(re.search(r"parcourus : (\d+) fichiers", val).group(1))))
sceaux = [(n, bool(re.search(r"^== SCEAU sha256:[0-9a-f]{64}", show(D322, f"{PREUVES}/{n}"), flags=re.M))) for n in
          ("audit-secrets-d322.txt", "audit-secrets-final.txt", "audit-secrets-cloture.txt")]
ctl("A2", "les trois sorties d'audit portent un sceau", [True, True, True], [s for _, s in sceaux])
sc = {}
for n in ("audit-secrets-d322.txt", "audit-secrets-final.txt", "audit-secrets-cloture.txt"):
    t = show_octets(D322, f"{PREUVES}/{n}")
    corps = t.split(b"== SCEAU")[0]
    declare = re.search(rb"== SCEAU sha256:([0-9a-f]{64})", t).group(1).decode()
    sc[n] = (hashlib.sha256(corps).hexdigest() == declare, hashlib.sha256(corps.replace(b"\r\n", b"\n")).hexdigest() == declare)
print(f"      (sceau recalculé sur le corps avant la ligne de sceau, brut / LF : {sc})")
tr = {n: show(D322, f"{PREUVES}/controles/{n}") for n in ("tri-audit-d322.txt", "tri-audit-final.txt", "tri-audit-cloture.txt")}
ctl("A3", "tri différentiel : 5 alertes neuves au premier audit (vs D321), 0 aux deux suivants",
    (5, 0, 0), tuple(int(re.search(r"ABSENTES de la précédente : (\d+)", tr[n]).group(1)) for n in tr))
print()

# ══ L — lecture adverse de D321 ═══════════════════════════════════════════════════════════════════════════════════════
print("== L — la lecture adverse de D321 que D322 verse")
so = show(D322, f"{PREUVES}/lecture-adverse/confronter-sortie.txt")
bilan = so.split("== BILAN")[1]
ctl("L1", "« 63 contrôles · 6 écarts · 7 constats » dans la sortie versée", (63, 6, 7),
    tuple(int(x) for x in re.search(r"(\d+) contrôles · (\d+) écart\(s\) \[.*?\] · (\d+) constat", bilan).groups()))
vent = {k: int(v) for k, v in re.findall(r"([A-Z]) (\d+)", re.search(r"ventilation par famille : (.*)", bilan).group(1))}
ctl("L2", "la ventilation par famille se somme à 63 (l'arithmétique de D322 est interne-cohérente)", 63, sum(vent.values()))
ctl("L3", "calibration « 16 bras, 0 manqué » (D322) dans la sortie", True, bool(re.search(r"16 bras · 0 manqué", so)))
ctl("L4", "les cinq passes : quatre sorties intermédiaires + la finale", 5,
    len([f for f in git("ls-tree", "--name-only", D322, f"{PREUVES}/lecture-adverse/").decode().split("\n") if "confronter-sortie" in f]))
ecarts_declares = set(re.findall(r"\*\*\(([A-Z]\d+)", S[S.index("**Les six écarts**"):S.index("**Les sept constats**")]))
ecarts_sortie = re.findall(r"'([A-Z]\d+)'", re.search(r"\d+ écart\(s\) \[(.*?)\]", bilan).group(1))
ctl("L5", "les six écarts écrits dans la section de D322 = ceux de la sortie versée (dérivés des deux textes)", sorted(ecarts_sortie), sorted(ecarts_declares))
print(f"      ({len(ecarts_sortie)} dans la sortie · {len(ecarts_declares)} dans la section)")
print()

# ══ I — catalogue ═════════════════════════════════════════════════════════════════════════════════════════════════════
print("== I — catalogue i18n (« aucune clé au catalogue »)")
ctl("I1", "`packages/i18n` : aucun fichier modifié entre `5a362d7` et `0e7a9f2`", [], [f for f in fichiers if f.startswith("packages/i18n/")])
fr, ar = (json.loads(show(D322, f"packages/i18n/messages/{l}.json")) for l in ("fr", "ar"))
ctl("I2", "parité de feuilles FR = AR à `0e7a9f2` (D321 : 1 098 = 1 098)", (1098, 1098), (feuilles(fr), feuilles(ar)))
print()

# ══ M — la réponse du lot à ses propres consignes ═════════════════════════════════════════════════════════════════════
print("== M — la partie A de D322 : ce qu'elle dit avoir écrit, et où")
lim = aplati(section(AVANT, "## Session du 01/10/2026 — D321")).replace("**", "")
puce = re.search(r"En arabe, les noms de ([^.]*?) restent en FRANÇAIS", lim)
ctl("M1", "la limite de D321 sur l'arabe, relue à `5a362d7` : « les noms de créneaux, de prestations et de paliers restent en FRANÇAIS » — "
          "et NI les jours NI les mois", (True, False),
    (bool(puce) and "créneaux" in puce.group(1), bool(puce) and bool(re.search(r"jours|mois", puce.group(1)))))
constat("M2", "la limite de D321 est un DÉFAUT DE PRODUIT ouvert, toujours vrai : en arabe, les noms de créneaux, de prestations et de paliers sortent en "
        "français dans le panneau de réservation. D322 ne le traite pas (hors de sa demande) et le rappelle ; il n'est pas non plus dans les décisions de "
        "Ko du rang 31 (partie A) — à ordonner par Ko (reports de D321).")
print()

# ══ O — ordre des rangs, registre ═════════════════════════════════════════════════════════════════════════════════════
print("== O — ordre des rangs, registre, compteur")
ordre = show(D322, "ZWADJ_CONTINUITE.md")
ctl("O1", "la dernière ligne « ⇒ RANG N » de l'ordre des rangs est le rang 31 EN ATTENTE (écrite à l'ouverture, vraie à la clôture)", True,
    "⇒ **RANG 31 : EN ATTENTE D'ARBITRAGE DE KO** (D284), aucun candidat arbitré" in ordre)
ctl("O2", "le registre : dernière ligne D322 ; aucune ligne D323 à `0e7a9f2`", ("D322", 0),
    (re.findall(r"^\| (D\d+) \|", ordre, flags=re.M)[-1], len(re.findall(r"^\| D323 \|", ordre, flags=re.M))))
ag = show(D322, "AGENTS.md")
ctl("O3", "`AGENTS.md` : le compteur DEUX est écrit à la clôture (« **rang 30 CLOS — compteur DEUX** ») et la règle « aucun lot de code ne s'ouvre avant une certification »",
    True, "**rang 30 CLOS — compteur DEUX** ⇒ **aucun lot de code ne s'ouvre avant une certification**" in aplati(ag).replace("\n", " "))
ctl("O4", "l'arbitrage de Ko du rang 30, MOT POUR MOT, est écrit dans l'ordre des rangs", True,
    "Rang 30 : le calendrier, suite — les noms de jours et de mois dans la langue de la page, le jour déjà demandé, le week-end, et le lien mort vers le calendrier de l'app Pro. Lot de code."
    in aplati(ordre))
print()

# ══ X — l'ARBRE DE TRAVAIL (lu en direct, pas à un SHA : c'est ce que la session a reçu) ═══════════════════════════════
print("== X — l'arbre de travail à l'ouverture de cette session (git status / git diff, LUS EN DIRECT)")
# Les trois fichiers d'autorité sont ÉCRITS par ce lot (partie A) : ils figurent à `git status` dès qu'il écrit. La famille X juge donc
# ce qui est modifié HORS d'eux — c'est ce que la session a reçu — et lit les trois autorités À `HEAD`, pas dans l'arbre (qui porte déjà
# le texte de ce lot, donc la mention qu'on cherche). Corrigé après une première exécution qui les avait comptés (voir D323, fautes).
AUTORITES_DU_LOT = ("AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md")
st_tout = [l for l in git("status", "--porcelain", "--untracked-files=no").decode("utf-8").split("\n") if l]
st = [l for l in st_tout if l[3:] not in AUTORITES_DU_LOT]
print(f"      ({len(st_tout)} fichier(s) suivi(s) modifié(s) au total · {len(st_tout) - len(st)} d'autorité écrit(s) par ce lot, écartés · {len(st)} jugé(s))")
non_suivis = [l for l in git("status", "--porcelain").decode("utf-8").split("\n") if l.startswith("??") and "docs/preuves/D323/" not in l]
ctl("X1", "après D322, `git status` (fichiers SUIVIS, hors les trois autorités que ce lot écrit) ne liste RIEN : l'arbre est propre", [], st)
ctl("X1b", "aucun fichier NON SUIVI hors de `docs/preuves/D323/` (la pièce de cette session)", [], non_suivis)
modifies = [l[3:] for l in st]
for f in modifies:
    d = git("diff", "HEAD", "--", f).decode("utf-8")
    ajout = [l[1:].strip() for l in d.split("\n") if l.startswith("+") and not l.startswith("+++")]
    print(f"      · {f} : {len(ajout)} ligne(s) ajoutée(s), sha256 du diff {hashlib.sha256(d.encode()).hexdigest()[:16]}…")
    print(f"        mtime {datetime.datetime.fromtimestamp(os.path.getmtime(f)).isoformat(timespec='seconds')} · "
          f"commit de D322 {git('log', '-1', '--format=%ci', D322).decode().strip()}")
    ctl("X2", f"`{f}` figurait dans la table d'ouverture de D322 (donc un contrôle PAR NOM de fichier la laisserait passer)", True,
        f in attendus)
    ctl("X3", f"le contenu des lignes ajoutées à `{f}` est décrit par D322 (« un lien et une sélection »)", True,
        all(re.search(r"setFormError|setNotice|scrollTo", l) is None for l in ajout))
    cles = re.findall(r't\("([a-zA-Z0-9_.]+)"\)', "\n".join(ajout))
    print(f"      · clés de catalogue référencées par les lignes ajoutées : {cles}")
    for c in cles:
        ctl("X4", f"la clé `{c}` existe dans le catalogue FR et AR à `{D322}`", (True, True),
            (isinstance(resoudre(fr, c), str), isinstance(resoudre(ar, c), str)))
    # Aucune des trois autorités ne mentionne ce changement.
    mentions = {n: len(re.findall(r"step1Invalid|« Enregistrer » ne faisait RIEN", show("HEAD", n))) for n in
                ("ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md")}
    ctl("X5", "AUCUN des trois fichiers d'autorité, lus À `HEAD`, ne mentionne ce changement (✓ = confirmé non mentionné : c'est le constat)",
        {"ZWADJ_CONTINUITE.md": 0, "ZWADJ_BACKLOG.md": 0, "AGENTS.md": 0}, mentions)
print()

# ══ BILAN ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
print("== BILAN")
print(f"   ventilation par famille : {' · '.join(f'{k} {v}' for k, v in sorted(familles.items()))}")
print(f"   {len(controles)} contrôles · {len(ecarts)} écart(s) DE D322 {ecarts} · {len(ecarts_arbre)} écart(s) DE L'ARBRE (famille X, "
      f"lus en direct — pas une affirmation de D322) {ecarts_arbre} · {len(constats)} constat(s) {constats}")
print("   NON VÉRIFIABLE ici (chat seulement) : les paroles de Ko et du relecteur transmises à l'ouverture du rang 30 ; l'état machine "
      "(secteur, RAM libre, PERF) relevé avant les portes de D322 — aucune pièce versée ne le porte.")
