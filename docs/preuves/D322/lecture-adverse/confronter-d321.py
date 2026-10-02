"""D322 — lecture adverse de D321 (rang 29, lot de code), confrontée aux objets git à des SHA FIXÉS.

POURQUOI IL EXISTE
  La forme de Ko au rang 30 : « lecture adverse depuis la clôture de D321, en entier ». Aucun commit n'existe après
  celui de D321 (`5a362d7`) ; la dernière lecture adverse (D321) couvrait D320. La session la lit donc comme la lecture
  adverse de D321 lui-même — interprétation écrite au point d'entrée du rang 30. Une session à froid a relu D321 sans
  rien écrire ; ses quatre constats sont repris en partie A et re-mesurés ici (B2, B3, E4, M1, X3).
  Chaque affirmation de D321 qui se vérifie dans le dépôt est confrontée à sa SOURCE : provenance, borne de D316, portes,
  campagnes, rouges, relevés, captures, entrées cochées, parité, passe D277, audits, ordre et registre. Une affirmation
  qui ne vit que dans le chat est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D322/lecture-adverse/confronter-d321.py > docs/preuves/D322/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, que ce
  lot modifie. DEUX rejeux, déclarés : (1) `neutralisation/verifier-mutations.py r26` (en mémoire, n'écrit rien) — légitime
  parce que les fichiers que `r26` cible n'ont pas changé depuis `5a362d7` (contrôle T1, mesuré ici même) ; (2) le TRI de
  `neutralisation/lancer-campagnes.py` (ses fonctions `campagnes()` et `fichiers_lus()`, importées), nourri de la liste des
  fichiers du commit de D321 — légitime parce que les 31 harnais n'ont pas changé depuis `5a362d7` (contrôle T2).

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d320.py` (D321) — il juge D320, pas D321 ; une lecture « à l'œil » des sections —
  elle rate les chiffres et les sources (D320, écart 9 ; ici, la source citée pour « 14 487 px »).

CALIBRATION, deux bras par famille de contrôle (D286) : chaque extracteur est joué sur un cas où le fait est connu VRAI et
  sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils ont PARCOURU et leur
  attendu à côté (D290), et le total des contrôles avec sa ventilation par famille (D295).
"""
import hashlib
import importlib.util
import json
import os
import re
import struct
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

D321 = "5a362d7"   # commit de D321
AVANT = "b5bd382"  # SHA de départ déclaré par D321 (commit de D320)
PREUVES = "docs/preuves/D321"
ANSI = re.compile(r"\x1b\[[0-9;]*m")

controles, ecarts, constats = [], [], []
familles: dict[str, int] = {}


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, check=True).stdout


def show(sha, chemin):
    return git("show", f"{sha}:{chemin}").decode("utf-8").replace("\r\n", "\n")


def show_octets(sha, chemin):
    return git("show", f"{sha}:{chemin}")


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        ecarts.append(ident)
    print(f"{'✓' if ok else '✗'} {ident:5} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:5} CONSTAT : {texte}")


def section(sha, titre_debut):
    t = show(sha, "ZWADJ_CONTINUITE.md")
    debut = t.index(titre_debut)
    fin = t.index("\n## ", debut + 10)
    return t[debut:fin]


def aplati(t):
    return re.sub(r"\s+", " ", t)


# ── Extracteurs (chacun calibré ci-dessous)
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


def feuilles(obj):
    if isinstance(obj, dict):
        return sum(feuilles(v) for v in obj.values())
    return 1


def dimensions_jpeg(octets):
    """(largeur, hauteur) lues dans le segment SOF d'un JPEG — sans bibliothèque."""
    # Défaut de la passe 1 : sans segment SOF, la lecture d'une longueur hors du tampon LEVAIT au lieu de rendre `None`
    # (bras négatif de la calibration). On s'arrête à la fin d'image (0xD9) ou faute d'octets.
    i = 2
    while i + 3 < len(octets):
        if octets[i] != 0xFF:
            i += 1
            continue
        marque = octets[i + 1]
        if marque == 0xD9:
            return None
        if marque in (0xC0, 0xC1, 0xC2):
            hauteur, largeur = struct.unpack(">HH", octets[i + 5:i + 9])
            return largeur, hauteur
        longueur = struct.unpack(">H", octets[i + 2:i + 4])[0]
        i += 2 + longueur
    return None


def indentation(ligne):
    return len(ligne) - len(ligne.lstrip(" "))


def ligne_setchosen(sha):
    lignes = [l for l in show(sha, "apps/client/src/components/venue/booking-request-panel.tsx").split("\n")
              if "setChosen({ date: day.date" in l]
    return lignes


def coches_d321(backlog):
    """(cochées [x], non cochées) des lignes qui portent le renvoi « réalisé — re-confronté » de D321."""
    renvoi = "(D321, 01/10/2026 : **réalisé** — re-confronté au code à `b5bd382`"
    lignes = [l for l in backlog.split("\n") if renvoi in l]
    return sum(l.startswith("- [x]") for l in lignes), sum(not l.startswith("- [x]") for l in lignes), len(backlog.split("\n"))


def corps(lignes, motif):
    """Le corps d'une fonction, de sa ligne de définition à l'accolade fermante de MÊME indentation, lignes dépouillées.
    Défaut de la passe 2 : les motifs « async function submit/load » n'existent pas — le code écrit `const submit = async
    () => {` et `const load = useCallback(async () => {` ; et comparer la seule ligne de définition ne prouvait rien du corps."""
    debut = next((i for i, l in enumerate(lignes) if motif in l), None)
    if debut is None:
        return []
    ind = indentation(lignes[debut])
    fin = next(i for i in range(debut + 1, len(lignes)) if indentation(lignes[i]) == ind and lignes[i].strip().startswith("}"))
    return [l.strip() for l in lignes[debut:fin + 1]]


# ── CALIBRATION (deux bras par famille, abandon si un seul manque)
bras = []


def calib(nom, mesure, attendu):
    bras.append((nom, mesure == attendu))
    print(f"  calibration {'✓' if mesure == attendu else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


print("== CALIBRATION — deux bras par famille, abandon si un seul manque")
_V = " Test Files  4 passed (4)\n      Tests  39 passed (39)\n"
calib("résumé vitest, positif", resume_vitest("\x1b[2m" + _V + "\x1b[22m"), [(4, 39)])
calib("résumé vitest, négatif (échec)", resume_vitest(" Test Files  1 failed | 3 passed (4)\n      Tests  1 failed (39)\n"), [])
calib("code de porte, positif", code_porte("x\nlint code=0 durée=13s\n", "lint"), (0, 13))
calib("code de porte, négatif (autre porte)", code_porte("x\nbuild code=0 durée=43s\n", "lint"), None)
calib("tests d'un fichier, positif", tests_de(" ✓ src/a.test.ts (13 tests) 39ms", "src/a.test.ts"), 13)
calib("tests d'un fichier, négatif", tests_de(" ✓ src/b.test.ts (13 tests) 39ms", "src/a.test.ts"), None)
calib("feuilles JSON, positif", feuilles({"a": {"b": "x", "c": "y"}, "d": "z"}), 3)
calib("feuilles JSON, négatif (vide)", feuilles({}), 0)
_jpeg = b"\xff\xd8" + b"\xff\xe0" + struct.pack(">H", 4) + b"\x00\x00" + b"\xff\xc0" + struct.pack(">HBHH", 11, 8, 14487, 1280)
calib("dimensions JPEG, positif (synthétique)", dimensions_jpeg(_jpeg), (1280, 14487))
calib("dimensions JPEG, négatif (pas de SOF)", dimensions_jpeg(b"\xff\xd8\xff\xd9"), None)
calib("indentation, positif", indentation("      x"), 6)
calib("indentation, négatif", indentation("x"), 0)
_bk = "- [x] a ✅ *(D321, 01/10/2026 : **réalisé** — re-confronté au code à `b5bd382` ; …)*\n- [ ] b\n"
calib("coches D321, positif", coches_d321(_bk)[:2], (1, 0))
calib("coches D321, négatif (renvoi absent)", coches_d321("- [x] a ✅ réalisé\n")[:2], (0, 0))
calib("corps de fonction, positif", len(corps(["  const f = () => {", "    x;", "  };"], "const f")), 3)
calib("corps de fonction, négatif (absent)", corps(["  const g = 1;"], "const f"), [])
manques = sum(not ok for _, ok in bras)
print(f"  calibration : {len(bras)} bras · {manques} manqué(s) (attendu 0)")
if manques:
    sys.exit("ABANDON : un bras de calibration manque — rien n'est confronté.")

# ── P · PROVENANCE
print("\n== P · provenance")
ctl("P1", "parent du commit de D321", AVANT, git("rev-parse", "--short=7", f"{D321}^").decode().strip())
ctl("P2", "commits après D321 sur origin/main", 0, int(git("rev-list", "--count", f"{D321}..origin/main").decode().strip()))
noms = git("show", "--name-only", "--format=", D321).decode().split()
hors = sorted(n for n in noms if not n.startswith(f"{PREUVES}/"))
# La table d'ouverture de D321, DÉVELOPPÉE par la session (ses lignes « client — … » et « pro — … » abrègent leurs chemins ;
# la consigne de Ko au rang 30 exige désormais des chemins complets précisément pour ce contrôle).
TABLE = sorted([
    "ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md",
    "apps/client/src/lib/booking-calendar.ts", "apps/client/src/lib/booking-calendar.test.ts",
    "apps/client/src/components/venue/booking-date-picker.tsx",
    "apps/client/src/components/venue/booking-request-panel.tsx",
    "apps/client/src/components/venue/booking-request-panel.test.tsx",
    "apps/client/src/lib/routes.ts", "apps/client/src/lib/login-path-guard.test.ts",
    "apps/client/src/components/account/account-settings-view.tsx", "apps/client/src/components/auth/auth-ui.tsx",
    "apps/client/src/components/auth/google-signin.tsx", "apps/client/src/components/auth/recovery-forms.tsx",
    "apps/client/src/components/auth/register-form.tsx", "apps/client/src/components/auth/verify-email-view.tsx",
    "apps/client/src/components/site-chrome.tsx", "apps/client/src/components/venue/visit-booking-panel.tsx",
    "apps/client/src/app/[locale]/auth/connexion/page.tsx",
    "apps/pro/src/routes.ts", "apps/pro/src/routes.test.tsx",
    "apps/pro/src/App.tsx", "apps/pro/src/auth/auth-ui.tsx", "apps/pro/src/auth/recovery-pages.tsx",
    "apps/pro/src/auth/register-page.tsx", "apps/pro/src/auth/require-pro.tsx",
    "packages/i18n/messages/fr.json", "packages/i18n/messages/ar.json",
    "apps/api/src/common/e2e-api-sans-surveillance.spec.ts",
    "e2e/specs/r25-demande-reservation.e2e.ts", "e2e/specs/r26-parcours-reservation.e2e.ts",
    "e2e/fixtures/panneau-reservation.ts",
    "neutralisation/neutralize-r29.py", "neutralisation/neutralize-r26.py",
])
print(f"   fichiers du commit : {len(noms)} parcourus · {len(hors)} hors {PREUVES}/ · table développée : {len(TABLE)}")
ctl("P3", "fichiers hors pièces = table d'ouverture développée (rien de plus, rien de moins)", TABLE, hors)
print(f"   (information, aucun attendu affirmé par D321) pièces versées sous {PREUVES}/ : {len(noms) - len(hors)}")

# ── B · BORNE DE D316
print("\n== B · borne de D316")
av, ap = ligne_setchosen(AVANT), ligne_setchosen(D321)
ctl("B1", "la ligne `setChosen` : une à chaque SHA, CONTENU identique", (1, 1, True),
    (len(av), len(ap), len(av) == 1 and len(ap) == 1 and av[0].strip() == ap[0].strip()))
ctl("B2", "son indentation (constat 1 de la session à froid)", (22, 26), (indentation(av[0]), indentation(ap[0])))
entree29 = aplati(section(D321, "## ~~PROCHAIN LOT~~ — rang 29"))
# Passe 4 : B3 vérifiait seulement que la phrase était écrite, et rangeait sa fausseté en constat — c'est un ÉCART de D321 à
# ce qu'il écrit, il se compte comme tel.
ecrit_octet = "priceCents: slot.priceCents })` reste **identique à l'octet**" in entree29
print(f"   le point d'entrée du rang 29 écrit « reste **identique à l'octet** » : {ecrit_octet}")
ctl("B3", "« reste identique à l'octet » (point d'entrée du rang 29) tient À LA LETTRE", True, av[0] == ap[0])
constat("B3", "le CONTENU est identique (B1) et la section D321 dit juste — « inchangée (seule son indentation bouge, sous le "
        "jour regardé) » ; l'octet ne l'est pas (22 → 26 espaces). Annotation : partie A, point 1 (point d'entrée du rang 29).")
panneau_av = show(AVANT, "apps/client/src/components/venue/booking-request-panel.tsx").split("\n")
panneau_ap = show(D321, "apps/client/src/components/venue/booking-request-panel.tsx").split("\n")
a = sorted(l.strip() for l in panneau_av if "previewDeposit(" in l)
b = sorted(l.strip() for l in panneau_ap if "previewDeposit(" in l)
ctl("B4", "lignes portant « previewDeposit( » : mêmes contenus aux deux SHA (≥ 1 vue)", (True, True), (len(a) >= 1, a == b))



for ident, motif in (("B5", "const submit = async () => {"), ("B6", "const load = useCallback(async () => {")):
    a, b = corps(panneau_av, motif), corps(panneau_ap, motif)
    print(f"   corps « {motif} » : {len(a)} ligne(s) à {AVANT} · {len(b)} à {D321}")
    ctl(ident, f"corps de « {motif} » : mêmes lignes aux deux SHA (> 1 ligne vue)", (True, True), (len(a) > 1, a == b))

# ── G · PORTES (extraits versés)
print("\n== G · portes")
p = {n: show(D321, f"{PREUVES}/portes/{n}.txt") for n in ("typecheck", "lint", "test", "build", "test-int", "test-e2e")}
ctl("G1", "typecheck : code, « Done »", ((0, 15), 8), (code_porte(p["typecheck"], "typecheck"), p["typecheck"].count("typecheck: Done")))
ctl("G2", "lint : code, « Done »", ((0, 13), 8), (code_porte(p["lint"], "lint"), p["lint"].count("lint: Done")))
ctl("G3", "test : résumés API · api-client · client · pro", [(59, 667), (4, 39), (24, 333), (29, 349)], resume_vitest(p["test"]))
ctl("G4", "test : code et durée", (0, 75), code_porte(p["test"], "test"))
ctl("G5", "build : code, « Done »", ((0, 43), 4), (code_porte(p["build"], "build"), p["build"].count("build: Done")))
ctl("G6", "test:int : 444 sur 36 fichiers, code", ([(36, 444)], (0, 316)), (resume_vitest(p["test-int"]), code_porte(p["test-int"], "test:int")))
e2e = p["test-e2e"]
ctl("G7", "e2e : 43 réussis, 1 ignoré, code", (True, True, (0, 166)),
    ("  43 passed" in e2e, "  1 skipped" in e2e, code_porte(e2e, "test:e2e")))
ctl("G8", "e2e : 0 « File change detected », 1 démarrage Nest", (0, 1),
    (e2e.count("File change detected"), e2e.count("Nest application successfully started")))
for ident, fichier, n in (("G9", "src/lib/booking-calendar.test.ts", 13), ("G10", "src/components/venue/booking-request-panel.test.tsx", 21),
                          ("G11", "src/lib/login-path-guard.test.ts", 5), ("G12", "src/routes.test.tsx", 2),
                          ("G13", "src/common/e2e-api-sans-surveillance.spec.ts", 3)):
    ctl(ident, f"tests de {fichier} dans l'extrait (« vert » de la section)", n, tests_de(p["test"], fichier))
constat("G14", "« Avertissement de build Next sur `outputFileTracingRoot` » présent dans l'extrait de build : "
        f"{'oui' if 'outputFileTracingRoot' in p['build'] else 'non'} — non mentionné par la section D321 (partie A, point 4).")

# ── N · CAMPAGNES
print("\n== N · campagnes")
r29 = show(D321, f"{PREUVES}/neutralisation/campagne-r29.log")
lus29 = [l for l in r29.split("\n") if l.startswith("   ancre 1→0") and "AssertionError" in l]
ctl("N1", "r29 : 15 mordues sur 15, chacune LUE (AssertionError)", (True, 15),
    ("15 garde(s) mordue(s) sur 15 cible(s) jouée(s)" in r29, len(lus29)))
ctl("N2", "r29 : la durée « 141 s » figure dans la pièce", True, bool(re.search(r"\b141\s?s\b|durée=141", r29)))
r26 = show(D321, f"{PREUVES}/neutralisation/campagne-r26.txt")
ctl("N3", "r26 : 4 mordues sur 4, code et durée", (True, True), ("4 garde(s) mordue(s) sur 4" in r26, "campagne r26 code=0 durée=459s" in r26))
r25 = show(D321, f"{PREUVES}/neutralisation/campagne-r25.txt")
ctl("N4", "r25 : 10 mordues sur 10 jouées, 1 non mesurée, code 3", (True, True, True),
    ("10 garde(s) mordue(s) sur 10" in r25, "1 non mesurée(s)" in r25, "campagne r25 code=3 durée=501s" in r25))
_l26 = r26.split("\n")
r264 = next((_l26[i + 1] for i, l in enumerate(_l26[:-1]) if l.startswith("✓ R26-4.")), "")
ctl("N5", "R26-4 se lit par l'expiration d'une assertion Playwright à réessai", True, "Timed out 7000ms waiting for expect(" in r264)
constat("N5", "R26-4 « mord » par `Timed out 7000ms waiting for expect(locator).toHaveCount` : le lecteur de `r26` le compte "
        "assertion PAR CONSTRUCTION (bras `_EXPECT` de sa calibration) — c'est la sémantique de Playwright (l'assertion réessaie "
        "jusqu'à son délai). La règle R1 « un délai dépassé n'est jamais une morsure » (D305) a été écrite sur vitest ; son "
        "extension aux assertions à réessai de Playwright n'est écrite NULLE PART. Sans conséquence ici (R26-4 n'est pas classée "
        "au chemin de l'argent) ; question pour le relecteur si une cible de ce chemin mord ainsi.")
# T1 — rejeu de verifier-mutations r26 (fichiers ciblés inchangés depuis D321)
cibles26 = sorted(set(re.findall(r'"fichier":\s*([A-Z_]+)', show(D321, "neutralisation/neutralize-r26.py"))))
consts = dict(re.findall(r'^([A-Z_]+)\s*=\s*"([^"]+)"', show(D321, "neutralisation/neutralize-r26.py"), flags=re.M))
fichiers26 = sorted(consts[c] for c in cibles26 if c in consts)
inchanges = [f for f in fichiers26 if not git("diff", "--name-only", D321, "--", f).decode().strip()]
ctl("T1", "fichiers ciblés par r26 inchangés depuis D321 (rejeu légitime)", (len(fichiers26) > 0, len(fichiers26)), (len(fichiers26) > 0, len(inchanges)))
rejeu = subprocess.run([sys.executable, "neutralisation/verifier-mutations.py", "r26"], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
# Défaut de la passe 2 : l'expression attendait « posées » accentué ; l'outil imprime « POSEES 4   ·   NON POSEES 0 ».
dit = re.findall(r"^\s*POSEES (\d+)\s+·\s+NON POSEES (\d+)", rejeu.stdout + rejeu.stderr, flags=re.M)
print("   rejeu verifier-mutations r26 :", " | ".join(l.strip() for l in (rejeu.stdout + rejeu.stderr).splitlines()[-3:]))
ctl("N6", "rejeu `verifier-mutations.py r26` : « 4 posées, 0 non posée » (affirmé par D321)", ("4", "0"), dit[-1] if dit else None)
pieces_d321 = [n for n in noms if n.startswith(f"{PREUVES}/")]
porte_mut = [n for n in pieces_d321 if "verifier" in n or "mutations" in n]
ctl("N7", "pièce versée portant la sortie de `verifier-mutations.py r26`", True, bool(porte_mut))
# T2 — rejeu du tri de lancer-campagnes sur la liste des fichiers du commit de D321
spec = importlib.util.spec_from_file_location("lc", "neutralisation/lancer-campagnes.py")
lc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lc)
# Défaut de la passe 2 : `glob` rend des chemins en `\` sous Windows, `ls-tree` en `/` — l'égalité échouait sur le séparateur.
harnais_d321 = [h for h in git("ls-tree", "--name-only", D321, "neutralisation/").decode().split() if os.path.basename(h).startswith("neutralize-")]
# Passe 5 : un harnais NEUF (celui du rang 30) est né depuis la passe finale ; rejoué tel quel, l'instrument aurait compté un
# harnais étranger à D321 dans son tri (T2, N8). Le tri se rejoue sur les SEULS harnais présents à D321 ; les neufs s'impriment.
tous = [h.replace("\\", "/") for h in lc.campagnes()]
harnais = [h for h in tous if h in harnais_d321]
print(f"   harnais aujourd'hui : {len(tous)} · présents à {D321} : {len(harnais)} · neufs depuis (hors tri) : {sorted(set(tous) - set(harnais_d321))}")
diff_h = [h for h in harnais if git("diff", "--name-only", D321, "--", h).decode().strip()]
ctl("T2", "harnais : mêmes noms qu'à D321, aucun modifié depuis (rejeu du tri légitime)", (sorted(harnais_d321), 0),
    (sorted(harnais), len(diff_h)))
retenues = sorted(os.path.basename(h) for h in harnais if lc.fichiers_lus(h) & set(noms))
ctl("N8", "tri rejoué : campagnes concernées par les fichiers de D321 (« 2 sur 31 : r25 et r29 »)",
    (["neutralize-r25.py", "neutralize-r29.py"], 31), (retenues, len(harnais)))
ctl("N9", "pièce versée portant la sortie de `lancer-campagnes.py --liste`", True,
    any("--liste" in show(D321, n) or "campagne(s) concernée(s)" in show(D321, n) for n in pieces_d321 if n.endswith((".txt", ".log"))))

# ── R · ROUGES
print("\n== R · rouges lus avant correctif")
cj = ANSI.sub("", show(D321, f"{PREUVES}/rouges/C-j-rouge.txt"))
la = ANSI.sub("", show(D321, f"{PREUVES}/rouges/L-a-rouge.txt"))
pa = ANSI.sub("", show(D321, f"{PREUVES}/rouges/P-a-rouge.txt"))
ctl("R1", "C-j : « expected 182 to be less than or equal to 33 » en AssertionError", True,
    "AssertionError: expected 182 to be less than or equal to 33" in cj)
m = re.search(r"AssertionError: expected \[ 'Nombre d\\'invités', …\((\d+)\) \] to deeply equal \[\]", la)
ctl("R2", "L-a : 8 champs sans <label> visible (1 nommé + …(7))", 8, (1 + int(m.group(1))) if m else None)
ctl("R3", "P-a : 21 adresses hors constantes", True, "AssertionError: expected [ …(21) ] to deeply equal []" in pa)

# ── A · RELEVÉ DES ADRESSES
print("\n== A · relevé des adresses écrites en dur")
rel = show(D321, f"{PREUVES}/adresses/releve.txt")
ctl("A1", "client : fichiers, occurrences, adresses", ("59", "38", "13"),
    re.search(r"apps/client/src : (\d+) fichiers parcourus · (\d+) occurrence\(s\) · (\d+) adresse", rel).groups())
ctl("A2", "pro : fichiers, occurrences, adresses", ("49", "40", "15"),
    re.search(r"apps/pro/src : (\d+) fichiers parcourus · (\d+) occurrence\(s\) · (\d+) adresse", rel).groups())
bloc_cal = rel.split("4 × /calendrier")[1].split("× /")[0] if "4 × /calendrier" in rel else ""
ctl("A3", "le relevé range la cible du lien mort (`edit-venue-page.tsx:422`, gabarit) parmi « 4 × /calendrier »", True,
    "apps/pro/src/venues/edit-venue-page.tsx:422 — gabarit" in bloc_cal)
constat("A3", "le lien mort du point 4 du rang 30 était DANS une pièce versée de D321, compté avec la vraie route `/calendrier` "
        "— un relevé par TEXTE d'adresse ne dit pas si l'adresse est une route déclarée. Non reproché à D321 (le relevé était en "
        "lecture seule, par consigne) ; c'est l'argument de l'entrée « adresses de pages écrites en dur ».")

# ── C · CAPTURES
print("\n== C · captures de la fiche salle")
rc = show(D321, f"{PREUVES}/captures/releve.txt")
ctl("C1", "fiche FR anonyme 1280 px : 4 950 px, 33 boutons", True, "fiche FR, anonyme, 1280 px : hauteur 4950 px" in rc and "boutons du panneau 33" in rc)
ctl("C2", "fiche FR connectée : 5 721 px, 35 boutons", True, "hauteur 5721 px" in rc and "boutons du panneau 35" in rc)
ctl("C3", "360 px : FR 364 px débordement OUI · AR 360 px non", (True, True),
    ("fiche FR, anonyme, 360 px : hauteur 6964 px · largeur 364 px pour une fenêtre de 360 px · débordement OUI" in rc,
     "fiche AR, anonyme, 360 px : hauteur 6864 px · largeur 360 px pour une fenêtre de 360 px · débordement non" in rc))
images = [n for n in noms if n.startswith(f"{PREUVES}/captures/images/")]
ctl("C4", "« FIN · 8 » et 8 images versées", (True, 8), ("FIN · 8 capture(s) tentée(s)" in rc, len(images)))
d04 = dimensions_jpeg(show_octets(D321, "docs/preuves/D316/captures/images/04-client-fr-salle.jpg"))
d26 = dimensions_jpeg(show_octets(D321, "docs/preuves/D316/captures/images/26-client-fr-salle-connecte.jpg"))
ctl("C5", "« avant » : dimensions des images 04 et 26 de D316", ((1280, 14487), (1280, 14798)), (d04, d26))
rel316 = show(D321, "docs/preuves/D316/captures/releve.txt")
ctl("C6", "la source citée par D321 — « avant (D316, `releve.txt`) » — porte 14 487", True,
    "14487" in rel316 or "14 487" in rel316)
sect321 = aplati(section(D321, "## Session du 01/10/2026 — D321"))
ctl("C7", "l'en-tête de colonne de D321 cite bien `releve.txt` de D316", True, "avant (D316, `releve.txt`)" in sect321)

# ── E · LES 62 ENTRÉES
print("\n== E · les 62 entrées « RÉALISÉ »")
bk = show(D321, "ZWADJ_BACKLOG.md")
x, nx, parcourues = coches_d321(bk)
print(f"   backlog à {D321} : {parcourues} lignes parcourues")
ctl("E1", "renvois « réalisé — re-confronté » de D321 : cochés / non cochés", (61, 0), (x, nx))
ctl("E2", "B:650 annotée « NE TIENT PAS », laissée ouverte", 1,
    sum(1 for l in bk.split("\n") if l.startswith("- [ ] Guest count selector") and "NE TIENT PAS" in l))
s62 = show(D321, f"{PREUVES}/entrees/confronter-62-sortie.txt")
ctl("E3", "sortie versée : TIENT 61 · NE TIENT PAS 1", True, "62 entrées · TIENT 61 · NE TIENT PAS 1 [650]" in s62)
sondes = [l.strip() for l in s62.split("\n") if re.match(r"^      [✓✗] ", l)]
carte = sum(1 for s in sondes if s.endswith("· carte"))
motif = sum(1 for s in sondes if re.search(r" · l\.\d+ : ", s))
migr = sum(1 for s in sondes if " migrations · " in s)
execu = sum(1 for s in sondes if re.search(r"vitest|playwright|exécut|passed", s))
print(f"   sondes : {len(sondes)} parcourues · carte des routes {carte} · motif dans un fichier {motif} · migrations {migr} · "
      f"autres {len(sondes) - carte - motif - migr} · exécution d'un test {execu} (attendu 0)")
ctl("E4", "aucune sonde n'EXERCE un comportement (constat 2 de la session à froid)", 0, execu)
constat("E4", "la preuve des 61 est la PRÉSENCE d'ancres dans le code — une route dans la carte des décorateurs, un motif hors "
        "commentaire, une migration : c'est le niveau `L` de D315 (« lu dans le code, non exercé »). Les mots « réalisé » et "
        "« tiennent » ne le disent pas. Annotation : partie A, point 2.")

# ── I · PARITÉ ET CLÉS NEUVES
print("\n== I · parité FR = AR")
fr_ap, ar_ap = json.loads(show(D321, "packages/i18n/messages/fr.json")), json.loads(show(D321, "packages/i18n/messages/ar.json"))
fr_av = json.loads(show(AVANT, "packages/i18n/messages/fr.json"))
ctl("I1", "feuilles FR / AR à D321, FR avant", (1098, 1098, 1095), (feuilles(fr_ap), feuilles(ar_ap), feuilles(fr_av)))
neuves = ("dayFree", "dayFull", "chosen")
ctl("I2", "les trois clés neuves, FR et AR, absentes avant", (True, True, False),
    (all(k in fr_ap["venueDetail"]["booking"] for k in neuves), all(k in ar_ap["venueDetail"]["booking"] for k in neuves),
     any(k in fr_av["venueDetail"]["booking"] for k in neuves)))

# ── M · DÉCISION DU RELECTEUR, MOT POUR MOT (constat 3 de la session à froid)
print("\n== M · décision du relecteur")
t321 = show(D321, "ZWADJ_CONTINUITE.md")
bloc = t321[t321.index("#### ⛔ DÉCISION DU RELECTEUR (chat), DÉLÉGUÉE PAR KO LE 01/10/2026 (D321)"):]
bloc = bloc[:bloc.index("\nE3 touche l'argent.")]
# Passe 4 : M1 attendait (True, False), c'est-à-dire qu'il ENTÉRINAIT l'absence de la forme de Ko — l'écart se compte.
capitales = "LE RÉGLAGE DES TAUX N'EST PAS JOURNALISÉ PENDANT LA PAUSE" in bloc
print(f"   bloc D321 : forme en capitales présente : {capitales}")
ctl("M1", "bloc D321 : la phrase de Ko y est MOT POUR MOT (« le réglage des taux n'est PAS journalisé pendant la pause »)", True,
    "le réglage des taux n'est PAS journalisé pendant la pause" in bloc)
constat("M1", "mêmes mots, casse différente : la phrase de Ko porte « PAS » seul en capitales ; le bloc l'a entièrement "
        "capitalisée (« écrite telle quelle », dit-il). Partie A, point 3 : la forme de Ko s'écrit mot pour mot dans le bloc.")

# ── D · PASSE D277 ET AUDITS
print("\n== D · passe D277 et audits")
inst = hashlib.sha256(show_octets(D321, f"{PREUVES}/passe-d277/balayage.py")).hexdigest()
ctl("D1", "instrument de la passe D277 : copie à l'octet (24802faf…)", "24802faf", inst[:8])
ae = show(D321, f"{PREUVES}/passe-d277/balayage-apres-ecriture.txt")
co = show(D321, f"{PREUVES}/passe-d277/balayage-controle.txt")
cpt = lambda t: re.findall(r"^\[sens [^\]]*\] « (.+?) » — HEAD (\d+) → arbre (\d+)", t, flags=re.M)  # noqa: E731
print(f"   motifs comptés : après écriture {len(cpt(ae))} · contrôle {len(cpt(co))}")
ctl("D2", "« contrôle » rend les mêmes comptes que « après écriture » (sur > 0 motifs)", (True, True), (len(cpt(ae)) > 0, cpt(ae) == cpt(co)))
vr = show(D321, f"{PREUVES}/controles/aucune-valeur-reelle.txt")
ck = show(D321, f"{PREUVES}/controles/aucun-cookie-reel.txt")
ctl("D3", "« 0 valeur réelle » : 0 porteur ; cookies : 0 porteur", (True, True),
    ("porteurs : 0 (attendu 0)" in vr, "porteurs : 0 (attendu 0)" in ck))
tf = show(D321, f"{PREUVES}/controles/tri-audit-final.txt")
ctl("D4", "tri de l'audit final : 0 alerte neuve", True, "alertes ABSENTES de la précédente : 0" in tf)

# ── L · LA LECTURE ADVERSE DE D320 PAR D321
print("\n== L · la lecture adverse de D320, faite par D321")
la_s = show(D321, f"{PREUVES}/lecture-adverse/confronter-sortie.txt")
ctl("L1", "« 69 contrôles · 1 écart · 5 constats »", True, bool(re.search(r"69 contrôle.*1 écart.*5 constat", aplati(la_s))))
versees = sorted(os.path.basename(n) for n in noms if n.startswith(f"{PREUVES}/lecture-adverse/confronter-sortie"))
ctl("L2", "sorties versées : passes 1, 2 et finale — la passe 3 perdue, comme D321 le déclare (faute n° 1)",
    ["confronter-sortie-passe1.txt", "confronter-sortie-passe2.txt", "confronter-sortie.txt"], versees)

# ── O · ORDRE ET REGISTRE À D321
print("\n== O · ordre des rangs et registre")
reg = [l for l in t321.split("\n") if re.match(r"^\| D\d{3} \|", l)]
ctl("O1", "dernière ligne du registre", "D321", reg[-1].split("|")[1].strip())
ordre = t321[t321.index("## ORDRE DES RANGS"):t321.index("## ~~PROCHAIN LOT~~ — rang 29")]
ctl("O2", "« ⇒ **RANG 30 : EN ATTENTE D'ARBITRAGE DE KO** » non barrée dans l'ordre des rangs", True,
    "\n⇒ **RANG 30 : EN ATTENTE D'ARBITRAGE DE KO** (D284)" in ordre)
ctl("O3", "compteur écrit à la clôture : « ZÉRO → UN »", True, "**Lot de code : compteur ZÉRO → UN.**" in ordre)
ctl("O4", "limite de D321 sur l'arabe : les noms de CRÉNEAUX, prestations, paliers — pas de jours ni de mois", (True, False),
    ("**En arabe, les noms de créneaux, de prestations et de paliers restent en FRANÇAIS**" in sect321,
     bool(re.search(r"noms? (de|des) (jours|mois)[^.]{0,80}(français|FRANÇAIS)", sect321))))
constat("O4", "la prémisse du point 1 du rang 30 (« en arabe, ils sont en français — limite déclarée par D321 ») ne se trouve PAS "
        "dans D321 : sa limite porte sur les noms de créneaux, de prestations et de paliers.")

# ── BILAN
print("\n== BILAN")
print("   ventilation par famille : " + " · ".join(f"{k} {v}" for k, v in sorted(familles.items())))
print(f"   {len(controles)} contrôles · {len(ecarts)} écart(s) {ecarts} · {len(constats)} constat(s) {constats}")
print("   NON VÉRIFIABLE ici (chat seulement) : les paroles de Ko et du relecteur transmises en ouverture du rang 29 ; "
      "le récit de la session à froid.")
