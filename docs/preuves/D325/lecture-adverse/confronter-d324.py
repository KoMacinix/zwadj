"""D325 — lecture adverse de D324 (rang 31, partie B : la certification qui couvre D321 et D322), confrontée aux objets git à des SHA FIXÉS.

POURQUOI IL EXISTE
  Forme de Ko au rang 32 : « lecture adverse depuis la clôture de D324, EN ENTIER, et EN ENTIER dans ton rapport final ».
  Le dernier commit est celui de la clôture de D324 (`9a295a2`, parent `257471d`, le protocole de l'étape 0) ; aucun commit ne le suit.
  Chaque affirmation de D324 qui se vérifie dans le dépôt est confrontée à sa SOURCE : les pièces versées de SA passe, les objets git,
  le texte des fichiers d'autorité. Une affirmation qui ne vit que dans le chat est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D325/lecture-adverse/confronter-d324.py > docs/preuves/D325/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF la famille X,
  qui lit l'état LIVE (`git status`, `git stash`, `git rev-parse`) PRÉCISÉMENT parce que c'est lui qui dit ce que la session a reçu ;
  ses lignes s'impriment sous un intitulé qui le dit. AUCUN rejeu de harnais ni de porte : la lecture adverse juge ce que D324 a
  écrit, pas ce que la machine ferait aujourd'hui.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d322.py` (D323) — il juge D322, pas D324 ; une lecture « à l'œil » — elle rate les chiffres
  et les sources (D320, écart 9 ; D322, écart C6). Les assistants (`ctl`, calibration à deux bras, textes aplatis) sont ceux de D323,
  RÉÉCRITS ici : aucun import, l'instrument de D323 reste une pièce.

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ;
  abandon si un bras manque. Les comptes s'impriment avec ce qu'ils ont PARCOURU et leur attendu à côté (D290), et le total des
  contrôles avec sa ventilation par famille (D295). Un attendu est DÉRIVÉ d'une pièce brute — jamais écrit de mémoire (D275).
"""
import datetime
import hashlib
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

FIN = "9a295a2"      # clôture de D324
PROTO = "257471d"    # protocole de l'étape 0 — le commit SUR LEQUEL la passe a été mesurée
AVANT = "4d36199"    # parent du protocole
D322 = "0e7a9f2"     # dernier commit de CODE certifié
D321 = "5a362d7"
PD = "docs/preuves/D324"
P = PD + "/passe-r31a-20261004-1855"
ANSI = re.compile(r"\x1b\[[0-9;]*m")
ESP = re.compile(r"[\s  ]+")

controles, ecarts, constats, ecarts_live = [], [], [], []
familles: dict[str, int] = {}


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show_octets(sha, chemin):
    return git("show", f"{sha}:{chemin}")


def show(sha, chemin):
    return show_octets(sha, chemin).decode("utf-8").replace("\r\n", "\n")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def piece(nom):
    """Une pièce de la passe, ANSI retiré, fins de ligne normalisées."""
    return ANSI.sub("", show(FIN, f"{P}/{nom}"))


def aplati(t):
    return re.sub(r"\s+", " ", t)


def entier(s):
    """« 3 313 » (espaces insécables compris) → 3313."""
    return int(ESP.sub("", s))


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
    n = [int(m) for m in re.findall(r"^\s+Tests\s+(\d+) passed", t, flags=re.M)]
    return list(zip(f, n))


def compte_motif(texte, motif):
    return len(re.findall(motif, ANSI.sub("", texte)))


def heures(texte):
    """(début, fin, secondes lues, code) d'un fichier `.heures`."""
    d = re.search(r"^début (\d\d)/(\d\d)/(\d{4}) (\d\d):(\d\d):(\d\d)", texte, flags=re.M)
    f = re.search(r"^fin (\d\d)/(\d\d)/(\d{4}) (\d\d):(\d\d):(\d\d) · (\d+) s · code (\d+)", texte, flags=re.M)
    if not d or not f:
        return None
    dd = datetime.datetime(int(d[3]), int(d[2]), int(d[1]), int(d[4]), int(d[5]), int(d[6]))
    ff = datetime.datetime(int(f[3]), int(f[2]), int(f[1]), int(f[4]), int(f[5]), int(f[6]))
    return dd, ff, int(f[7]), int(f[8])


def bilan(texte):
    """(mordues, jouées, non mesurées) d'un journal de campagne : « N garde(s) mordue(s) sur M cible(s) jouée(s) · K non mesurée(s) »."""
    m = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) jouée\(s\) · (\d+) non mesurée", texte)
    if m:
        return (int(m[1]), int(m[2]), int(m[3]))
    # Seconde forme du bilan, celle des harnais verrouillés : « N garde(s) mordue(s) sur M cible(s) RÉELLEMENT MESURÉE(S). »
    m = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) RÉELLEMENT MESURÉE", texte)
    return (int(m[1]), int(m[2]), 0) if m else None


def sceau_valide(octets):
    """Même règle que `neutralisation/audit-secrets.py` : la DERNIÈRE ligne est un sceau qui couvre exactement le reste."""
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


def etat_csv(texte):
    """Lignes de `etat.csv` : liste de dicts."""
    lignes = [l for l in texte.lstrip("﻿").split("\n") if l.strip()]
    cles = lignes[0].split(";")
    return [dict(zip(cles, l.split(";"))) for l in lignes[1:]]


# ══ CALIBRATION — deux bras par extracteur ; abandon si un seul manque ═════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("vitest positif (ANSI)", resume_vitest("\x1b[2m Test Files \x1b[22m \x1b[1m\x1b[32m59 passed\x1b[39m (59)\n      Tests  667 passed (667)\n"), [(59, 667)])
bras("vitest négatif (un échec : pas de « passed » seul)", resume_vitest(" Test Files  1 failed | 58 passed (59)\n      Tests  3 failed | 664 passed (667)\n"), [])
bras("entier avec espace insécable étroit", entier("3 313"), 3313)
bras("entier simple", entier("228"), 228)
bras("heures positif", heures("début 04/10/2026 18:54:09\nfin 04/10/2026 18:54:28 · 18 s · code 0\n")[2:], (18, 0))
bras("heures négatif (ligne de fin absente)", heures("début 04/10/2026 18:54:09\n"), None)
bras("bilan positif", bilan("11 garde(s) mordue(s) sur 11 cible(s) jouée(s) · 0 non mesurée(s) (attendu : 11 sur 11)"), (11, 11, 0))
bras("bilan positif, seconde forme (RÉELLEMENT MESURÉE)", bilan("2 garde(s) mordue(s) sur 2 cible(s) RÉELLEMENT MESURÉE(S)."), (2, 2, 0))
bras("bilan négatif", bilan("rien"), None)
corps_ok = b"corps\n"
sc_ok = corps_ok + (
    "== SCEAU sha256:{} — neutralisation/audit-secrets.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==\n"
).format(hashlib.sha256(corps_ok).hexdigest()).encode("utf-8")
bras("sceau positif", sceau_valide(sc_ok), True)
bras("sceau négatif (un octet changé)", sceau_valide(sc_ok.replace(b"corps", b"corpS")), False)
bras("état CSV : lignes lues", len(etat_csv("﻿a;b\n1;2\n3;4\n")), 2)
bras("compte de motif", compte_motif("\x1b[32mDone\x1b[0m Done x", r"Done"), 2)
if not all(cal):
    print("✗ ABANDON : une calibration a manqué")
    sys.exit(2)

# ══ LECTURE ══════════════════════════════════════════════════════════════════════════════════════════════════════════
TXT = show(FIN, "ZWADJ_CONTINUITE.md")
PLAT = aplati(TXT)
print(f"\ntexte de D324 lu à {FIN} : {len(TXT)} caractères, {TXT.count(chr(10)) + 1} lignes")

# ── P : PROVENANCE ───────────────────────────────────────────────────────────────────────────────────────────────────
print("\n== P — PROVENANCE (objets git)")
rp = lambda s: git("rev-parse", s).decode().strip()
ctl("P1", "le parent de la clôture est le protocole de l'étape 0", rp(PROTO), rp(f"{FIN}^"))
ctl("P2", "le parent du protocole est le dernier commit de D323", rp(AVANT), rp(f"{PROTO}^"))
hors = lambda a, b: sorted(l for l in git("diff", "--name-only", a, b).decode().split("\n") if l and not l.startswith("docs/preuves/"))
TROIS = ["AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md"]
ctl("P3", "la clôture touche, hors `docs/preuves/`, les trois `.md` d'autorité et rien d'autre", TROIS, hors(PROTO, FIN))
ctl("P4", "le protocole ne touche, hors `docs/preuves/`, que des `.md` d'autorité (sous-ensemble des trois)", True, set(hors(AVANT, PROTO)) <= set(TROIS))
constat("P4b", f"fichiers que le protocole touche hors `docs/preuves/` : {hors(AVANT, PROTO)} — le commit n'a pas touché `AGENTS.md` ni le backlog")
ctl("P5", "le code mesuré par la passe = celui de D322 : aucun fichier hors `.md` d'autorité et `docs/preuves/` entre `0e7a9f2` et le protocole",
    [], [f for f in hors(D322, PROTO) if f not in TROIS])
anc = lambda a, b: subprocess.run(["git", "merge-base", "--is-ancestor", a, b]).returncode == 0
ctl("P6", "D321 et D322 (`5a362d7`, `0e7a9f2`) sont ANCÊTRES du commit mesuré", (True, True), (anc(D321, PROTO), anc(D322, PROTO)))
prog = piece("progression.txt")
ctl("P7", "la passe annonce son HEAD attendu : le SHA complet du protocole", rp(PROTO),
    re.search(r"HEAD attendu ([0-9a-f]{40})", prog)[1])
arbres = [piece(f"arbre-{i}.txt") for i in range(1, 7)]
def statut_vide(a):
    """Le bloc « git status --porcelain » de la pièce est VIDE : rien entre sa ligne d'en-tête et `--- fin`."""
    m = re.search(r"--- git status --porcelain[^\n]*\n(.*?)--- fin", a, flags=re.S)
    return None if m is None else m[1].strip() == ""
ctl("P8", "les six pièces d'arbre : HEAD = le SHA complet du protocole, bloc de statut VIDE (lu dans la pièce, pas dans `progression.txt`)", [(rp(PROTO), True)] * 6,
    [((re.search(r"^HEAD ([0-9a-f]{40})", a, flags=re.M) or [None, None])[1], statut_vide(a)) for a in arbres])
ctl("P9", "les six lignes d'arbre de `progression.txt` : « 0 ligne(s) de statut (attendu 0) »", 6, len(re.findall(r"arbre-\d : HEAD 257471d \(attendu 257471d\) · 0 ligne\(s\) de statut \(attendu 0\)", prog)))
fichiers_p = [l for l in git("ls-tree", "-r", "--name-only", FIN, P).decode().split("\n") if l]
ctl("P10", "« 183 pièces » : les fichiers du dossier de SA passe à la clôture", 183, len(fichiers_p))

# ── G : PORTES ───────────────────────────────────────────────────────────────────────────────────────────────────────
print("\n== G — LES SIX PORTES (pièces de SA passe contre le tableau de D324)")
_deb = TXT.index("### ✅ RÉSULTAT (D324, 04/10/2026)")
TABLE = TXT[_deb: TXT.index("\n## ", _deb)]
rows = {}
for _m in re.finditer(r"^\| `([^`]+)`.*$", TABLE, flags=re.M):
    rows.setdefault(_m.group(1), _m.group(0))
for porte, dossier in (("typecheck", "typecheck"), ("lint", "lint"), ("test", "test"), ("build", "build"), ("test:int", "testint"), ("test:e2e", "e2e")):
    code = int(piece(f"{dossier}.code").strip())
    h = heures(piece(f"{dossier}.heures"))
    ligne = rows.get(porte, "")
    ds = re.search(r"\((\d+) s\)", ligne)
    ctl(f"G-{porte}", "code RÉEL 0 ; durée du tableau = durée écrite dans `.heures`", (0, h[2] if h else None), (code, int(ds[1]) if ds else None))
    if h:
        # Les horodatages sont tronqués à la seconde, la durée écrite est chronométrée : un écart de ±1 s est de l'ARRONDI, pas un défaut.
        ecart_s = abs(int((h[1] - h[0]).total_seconds()) - h[2])
        ctl(f"G-{porte}b", "la durée écrite dans `.heures` = (fin − début) des horodatages, à ±1 s près (troncature)", True, ecart_s <= 1)
tc = piece("typecheck.log")
ctl("G1", "typecheck : « Done » et `error TS`", (8, 0), (compte_motif(tc, r"\bDone\b"), compte_motif(tc, r"error TS")))
ctl("G2", "lint : « Done »", 8, compte_motif(piece("lint.log"), r"\bDone\b"))
ctl("G3", "build : « Done »", 4, compte_motif(piece("build.log"), r"\bDone\b"))
r_test = resume_vitest(piece("test.log"))
ctl("G4", "test : les quatre paires (fichiers, tests) du tableau, lues dans le journal en entier", [(59, 667), (4, 39), (25, 344), (30, 352)], r_test)
ctl("G5", "test : « = 1 402 / 118 » = la somme des paires lues", (1402, 118), (sum(n for _, n in r_test), sum(f for f, _ in r_test)))
ctl("G6", "test:int : 444 tests / 36 fichiers", [(36, 444)], resume_vitest(piece("testint.log")))
ex = piece("e2e-EXTRAIT.txt")
ctl("G7", "test:e2e : « 43 passés · 1 ignoré sur 44 » = le résumé de l'extrait", {"skipped": 1, "passed": 43},
    eval(re.search(r"résumé : (\{[^}]*\})", ex)[1]))
ctl("G8", "e2e : « 1 221 lignes parcourues » écrit AVEC son attendu à côté", ("1221", "1221"),
    tuple(re.search(r"lignes parcourues : (\d+) \(attendu (\d+)", ex).groups()))
ctl("G9", "e2e : « 47 gardées »", 47, int(re.search(r"gardées : (\d+)", ex)[1]))
ctl("G10", "le tableau dit « sur 44 » : `Running` de l'extrait", 44, int(re.search(r"Running (\d+) tests", ex)[1]))

# ── C : CAMPAGNES ────────────────────────────────────────────────────────────────────────────────────────────────────
print("\n== C — LES CAMPAGNES")
tout = piece("campagnes-tout.log")
m = re.search(r"MESURÉ : (\d+) garde\(s\) mordue\(s\) · (\d+) muette\(s\)/erreur\(s\) · (\d+) non mesurée\(s\) · (\d+) campagne\(s\) · (\d+)s", tout)
ligne_tout = rows.get("--tout", "")
mt = re.search(r"\*\*(\d+) campagnes · (\d+) mordues · (\d+) muette · (\d+) non mesurées\*\*, ([\d   ]+) s", ligne_tout)
ctl("C1", "`--tout` : campagnes · mordues · muettes · non mesurées · secondes, tableau contre journal",
    (int(m[4]), int(m[1]), int(m[2]), int(m[3]), int(m[5])),
    (int(mt[1]), int(mt[2]), int(mt[3]), int(mt[4]), entier(mt[5])))
ctl("C2", "`--tout` : code de sortie 1, attendu par D324", 1, int(piece("campagnes-tout.code").strip()))
ctl("C3", "`--tout` : 228 + 21 = 249 = le total déclaré", 249, int(m[1]) + int(m[3]))
dossiers = {d: len([f for f in fichiers_p if f.startswith(f"{P}/{d}/")]) for d in ("campagnes", "rang23", "available-on-api")}
ctl("C4", "« 77 journaux de CETTE passe copiés » = campagnes + rang23 + available-on-api versés", 77, sum(dossiers.values()))
ctl("C4b", "ventilation : 32 campagnes · 15 `rang23` · 30 `available-on-api`", {"campagnes": 32, "rang23": 15, "available-on-api": 30}, dossiers)
claims = re.findall(r"`([a-z0-9\-]+)` \*\*(\d+)\*\* \((\d+) s", rows["--int"])
mes = []
claims = [("solid" + nom if nom.startswith("-") else nom, n, s) for nom, n, s in claims]
for nom, n, s in claims:
    b = bilan(piece(f"int-{nom}.log"))
    h = heures(piece(f"int-{nom}.heures"))
    mes.append((nom, b[0] if b else None, h[2] if h else None))
ctl("C5", "`--int` ×7 : (harnais, mordues, secondes) du tableau contre les journaux de la passe",
    [(nom, int(n), int(s)) for nom, n, s in claims], mes)
ctl("C6", "`--int` ×7 : la somme 8 + 11 + 13 + 2 + 5 + 6 + 6 = 51", 51, sum(int(n) for _, n, _ in claims))
ctl("C7", "`--int` : sept harnais énumérés par le tableau", 7, len(claims))
r26 = bilan(piece("e2e-r26.log"))
h26 = heures(piece("e2e-r26.heures"))
ctl("C8", "`--e2e` ×1 (`r26`) : 4 mordues, 416 s", (4, 416), (r26[0] if r26 else None, h26[2] if h26 else None))
ce = piece("contre-epreuve.log")
ctl("C9", "contre-épreuve : « 5 garde(s) mordue(s) sur 5 cible(s) »", (5, 5), tuple(int(x) for x in re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ce).groups()))

# ── L : LECTURES ─────────────────────────────────────────────────────────────────────────────────────────────────────
print("\n== L — LES LECTURES")
lc = piece("lecture-campagnes.txt")
ligne_cert = re.search(r"CERTIFIANT : (\d+) mordues · (\d+) muettes · (\d+) non mesurées · (\d+) campagnes qui COMPTENT sur (\d+)", lc)
ctl("L1", "CERTIFIANT 249 · 0 · 0, 32 sur 32", (249, 0, 0, 32, 32), tuple(int(x) for x in ligne_cert.groups()))
rows_lc = [l for l in lc.split("\n") if re.match(r"^[a-z0-9\-]+\s+(--tout|--int|--e2e)\s", l)]
ctl("L2", "le tableau de la lecture : 32 lignes de campagne (parcourues)", 32, len(rows_lc))
som = lambda motif: sum(int(x) for l in rows_lc for x in re.findall(motif, l))
etiq = (som(r"lue chemin (\d+)"), som(r"lue hors chemin (\d+)"), som(r"non prouvée \(R1\) (\d+)"), som(r"non classée (\d+)"))
ctl("L3", "les étiquettes 13 · 27 · 81 · 128, SOMMÉES depuis les 32 lignes (pas depuis la ligne de total)", (13, 27, 81, 128), etiq)
ctl("L4", "la somme des étiquettes = 249", 249, sum(etiq))
total_mord = sum(int(re.match(r"^\S+\s+\S+\s+\d+\s+(\d+)", l)[1]) for l in rows_lc)
ctl("L5", "la colonne « mordues » des 32 lignes se somme à 249", 249, total_mord)
planchers = {m[1]: float(m[3]) for m in re.finditer(r"^P (\S+) (\S+) ([\d.]+)$", show(FIN, f"{PD}/plancher/plancher.txt"), flags=re.M)}
ctl("L6", "28 planchers dans `plancher.txt`", 28, len(planchers))
dessus = [l for l in rows_lc if "≥ plancher" in l]
ctl("L7", "« 28 au-dessus de leur plancher » : les lignes qui portent « ≥ plancher »", 28, len(dessus))
lues = [l for l in rows_lc if re.search(r"\bLUE\b", l)]
ctl("L8", "« 4 LUES » : `rang23`, `available-on-api`, `r25`, `r26`", sorted(["rang23", "available-on-api", "r25", "r26"]), sorted(l.split()[0] for l in lues))
mal = []
for l in dessus:
    mm = re.search(r"^(\S+)\s.*?\s(\d+) s ≥ plancher ([\d.]+) s", l)
    nom, dur, pl = mm[1], int(mm[2]), float(mm[3])
    if planchers.get(nom) != pl or dur < pl:
        mal.append((nom, dur, pl, planchers.get(nom)))
ctl("L9", "chaque ligne « durée ≥ plancher » : le plancher imprimé = celui de `plancher.txt`, et la durée l'atteint", [], mal)
serres = {"argon2": (16, 4.83), "booking-status": (16, 4.89), "horizon": (114, 22.92), "available-on": (213, 38.73), "maxprice": (213, 38.13), "r29": (131, 4.65), "r30": (60, 4.62)}
lu_dur = {l.split()[0]: int(re.search(r"(\d+) s ≥ plancher", l)[1]) for l in dessus}
ctl("L10", "« les plus serrés » (durée, plancher) écrits par D324, contre la lecture", serres, {k: (lu_dur.get(k), planchers.get(k)) for k in serres})
ctl("L11", "« ×3,3 » pour `argon2` et `booking-status`, « ×5,0 » pour `horizon` : le rapport durée / plancher, arrondi à 0,1",
    (3.3, 3.3, 5.0), (round(lu_dur["argon2"] / planchers["argon2"], 1), round(lu_dur["booking-status"] / planchers["booking-status"], 1), round(lu_dur["horizon"] / planchers["horizon"], 1)))
r23 = piece("lecture-rang23.txt")
ctl("L12", "`rang23` : « MESURES LUES : 13 · MORSURES LUES : 13 · DÉMARRÉES : 13 »", (13, 13, 13), tuple(int(x) for x in re.search(r"MESURES LUES : (\d+) · MORSURES LUES : (\d+) · DÉMARRÉES \(exécutés > 0\) : (\d+)", r23).groups()))
aoa = piece("lecture-available-on-api.txt")
ctl("L13", "`available-on-api` : 30 journaux · 12 pré-vols · 0 écart", (30, 12, 0), tuple(int(x) for x in re.search(r"RÉSUMÉ : journaux, pré-vol, écarts = \((\d+), (\d+), (\d+)\)", aoa).groups()))
lr = piece("lecture-main-r26.txt")
constat("L14", f"la lecture à la main de R26-2 et R26-4 : pièce de {len(lr.splitlines())} lignes ; lecture des quatre extraits : "
                f"{sorted(os.path.basename(f) for f in fichiers_p if '/lecture-r26/' in f)}")

# ── S : ÉCHANTILLONNEUR ──────────────────────────────────────────────────────────────────────────────────────────────
print("\n== S — L'ÉCHANTILLONNEUR (`etat.csv`, relu en entier)")
csv = etat_csv(piece("etat.csv"))
ctl("S1", "215 échantillons parcourus", 215, len(csv))
t0 = datetime.datetime.strptime(csv[0]["horodatage"], "%Y-%m-%d %H:%M:%S")
t1 = datetime.datetime.strptime(csv[-1]["horodatage"], "%Y-%m-%d %H:%M:%S")
ctl("S2", "fenêtre de l'échantillonneur : 112,8 min", 112.8, round((t1 - t0).total_seconds() / 60, 1))
perf = [float(r["perf_pct"]) for r in csv]
ctl("S3", "PERF : min 75,9 · max 168,1 · au-dessus de 100 sur 196", (75.9, 168.1, 196), (min(perf), max(perf), sum(1 for p in perf if p > 100)))
ram = [float(r["ram_libre_mo"]) for r in csv]
ctl("S4", "RAM : min 2 847 · 57 échantillons sous la barre 4 579", (2847.0, 57), (min(ram), sum(1 for r in ram if r < 4579)))
ctl("S5", "alimentation : SECTEUR seul ; chrome max 0 ; node max 19", ({"SECTEUR"}, 0, 19), ({r["alim"] for r in csv}, max(int(r["chrome"]) for r in csv), max(int(r["node"]) for r in csv)))
ecart = [(datetime.datetime.strptime(csv[i + 1]["horodatage"], "%Y-%m-%d %H:%M:%S") - datetime.datetime.strptime(csv[i]["horodatage"], "%Y-%m-%d %H:%M:%S")).total_seconds() for i in range(len(csv) - 1)]
ctl("S6", "écarts entre échantillons : 214, de 31 à 33 s, aucun au-delà de 60 s", (214, 31.0, 33.0, 0), (len(ecart), min(ecart), max(ecart), sum(1 for e in ecart if e > 60)))
sondes = [f for f in fichiers_p if re.search(r"/sonde-[^/]+\.txt$", f)]
ctl("S7", "« les 20 relevés de sonde » : les fichiers `sonde-*.txt`", 20, len(sondes))
bandes_basses = []
for f in sondes:
    mm = re.search(r"RAM_BANDE_MO=(\d+)-(\d+)", ANSI.sub("", show(FIN, f)))
    if mm:
        bandes_basses.append((int(mm[1]), os.path.basename(f)))
ctl("S8", "« la plus basse bande basse : 5 090, `apres-e2e-r26` »", (5090, "sonde-apres-e2e-r26.txt"), min(bandes_basses) if bandes_basses else None)

# ── Z : LES PLANCHERS (étape 0) ──────────────────────────────────────────────────────────────────────────────────────
print("\n== Z — LES PLANCHERS (`simulation-sortie.txt` relu en entier)")
sim = ANSI.sub("", show(FIN, f"{PD}/plancher/simulation-sortie.txt"))
mesures = re.findall(r"^\s+· (\S+)\s+(?:tout|--int)\s+([AB]) :\s+([\d.]+) s · code\s+(\d+) · « ✓ »\s+(\d+) · « ✗ »\s+(\d+) · cibles\s+(\d+)", sim, flags=re.M)
ctl("Z1", "« 56 mesures (28 × 2) » : lignes de mesure parcourues, A puis B", (56, 28, 28), (len(mesures), sum(1 for x in mesures if x[1] == "A"), sum(1 for x in mesures if x[1] == "B")))
ctl("Z2", "« 0 bras manqué » : la ligne de bilan de la simulation", 0, int(re.search(r"BRAS ET DÉFAUTS MANQUÉS : (\d+)", sim)[1]))
tab = {m[0]: float(m[5]) for m in re.findall(r"^T (\S+) (\S+) (\d+) ([\d.]+) ([\d.]+) ([\d.]+) (\d+)$", sim, flags=re.M)}
ctl("Z3", "chaque plancher de `plancher.txt` = 3 × T (le non-démarrage le plus long, A ou B), à 0,01 s près — 28 vérifiés",
    {k: round(3 * v, 2) for k, v in tab.items()}, {k: planchers[k] for k in tab})
par = {}
for nom, ab, sec, code, ok_, ko_, cib in mesures:
    par.setdefault(nom, []).append((int(ok_), int(ko_)))
avec_echec = sorted(k for k, v in par.items() if all(ko > 0 for _, ko in v))
sans_rien = sorted(k for k, v in par.items() if all(ok == 0 and ko == 0 for ok, ko in v))
complete = sorted(k for k, v in par.items() if all(ok > 0 for ok, _ in v))
ctl("Z4", "« vingt-deux harnais rendent un ou plusieurs ✗, quatre s'arrêtent à leur pré-vol » + les deux qui rendent une campagne complète",
    (22, ["act-plafonds", "argon2", "budgets", "horloge"], ["available-on", "journey"]), (len(avec_echec), sans_rien, complete))
ctl("Z5", "les plus petit et plus grand planchers : `budgets` 0,84 s ; `404` 46,44 s", (("budgets", 0.84), ("404", 46.44)),
    (min(planchers.items(), key=lambda kv: kv[1]), max(planchers.items(), key=lambda kv: kv[1])))

# ── D : DURÉE DE LA PASSE ────────────────────────────────────────────────────────────────────────────────────────────
print("\n== D — LA DURÉE DE LA PASSE (une valeur que le texte répète quatre fois)")
mm = re.search(r"^(\d\d)/(\d\d)/(\d{4}) (\d\d):(\d\d):(\d\d) PASSE ", prog, flags=re.M)
fm = re.search(r"^(\d\d)/(\d\d)/(\d{4}) (\d\d):(\d\d):(\d\d) CLÔTURE ATTEINTE", prog, flags=re.M)
d0 = datetime.datetime(int(mm[3]), int(mm[2]), int(mm[1]), int(mm[4]), int(mm[5]), int(mm[6]))
d1 = datetime.datetime(int(fm[3]), int(fm[2]), int(fm[1]), int(fm[4]), int(fm[5]), int(fm[6]))
minutes = (d1 - d0).total_seconds() / 60
dits = [int(x) for x in re.findall(r"(?:\*\*)?(\d+) min(?:\*\*)?[,)]?", re.search(r"\(18:52:02 → 20:46:33, \*\*(\d+) min\*\*", TXT)[0])]
dit_min = int(re.search(r"20:46:33, \*\*(\d+) min\*\*", TXT)[1])
ctl("D1", "« 18:52:02 → 20:46:33, 113 min » : les deux horodatages de `progression.txt`, soustraits", dit_min, round(minutes))
constat("D2", f"18:52:02 → 20:46:33 = {minutes:.2f} min ({int((d1 - d0).total_seconds())} s) ; « 113 min » est répété {PLAT.count('113 min')} fois dans la section ; "
              f"la fenêtre de l'échantillonneur, elle, est de 112,8 min — le texte semble avoir pris l'une pour l'autre")

# ── A : AUDITS ───────────────────────────────────────────────────────────────────────────────────────────────────────
print("\n== A — LES AUDITS DE SECRETS")
av = piece("aucune-valeur-reelle.txt")
ctl("A1", "« 80 valeurs cherchées (9 journaux), 3 028 fichiers, 0 porteur »", (80, 9, 3028, 0),
    tuple(int(x) for x in re.search(r"valeurs cherchées : (\d+) \((\d+) journal/journaux\) · parcourus : (\d+) fichiers, \d+ octets · porteurs : (\d+)", av).groups()))
ac = piece("aucun-cookie-reel.txt")
ctl("A2", "« contrôle cookie : 179 valeurs, 3 029 fichiers, 0 porteur »", (179, 3029, 0),
    tuple(int(x) for x in re.search(r"valeurs cherchées : (\d+) \(\d+ journal/journaux\) · parcourus : (\d+) fichiers, \d+ octets · porteurs : (\d+)", ac).groups()))
scelles = [f for f in git("ls-tree", "--name-only", FIN, PD + "/").decode().split("\n") if re.search(r"audit-secrets-[^/]+\.txt$", f)]
ctl("A3", "les sorties d'audit de D324 portent un sceau qui couvre EXACTEMENT leurs octets (recalculé)", {f: True for f in scelles}, {f: sceau_valide(show_octets(FIN, f)) for f in scelles})
ctl("A4", "trois sorties d'audit à la racine de D324 (étape 0, clôture, final)", 3, len(scelles))
ctl("A5", "le tri différentiel final : « alertes ABSENTES de la précédente : 0 »", 0, int(re.search(r"alertes ABSENTES de la précédente : (\d+)", show(FIN, f"{PD}/tri-audit-final.txt"))[1]))

# ── F : RÉFÉRENCES ───────────────────────────────────────────────────────────────────────────────────────────────────
print("\n== F — LES CHEMINS QUE D324 CITE existent à la clôture")
debut = TXT.index("## ~~PROCHAIN LOT~~ — rang 31")
fin = TXT.index("## ~~PROCHAIN LOT~~ — rang 30")
zone = TXT[debut:fin]
# la section D323 est comprise dans cette zone : on ne juge que ce qui cite D324 ou `P/`
cites = set(re.findall(r"`((?:docs/preuves/D324/|P/)[^`\s;,]*)`", zone))
absents, globs, lus = [], 0, 0
for c in sorted(cites):
    if "*" in c or "<" in c:
        globs += 1
        continue
    chemin = c.replace("P/", P + "/", 1) if c.startswith("P/") else c
    chemin = chemin.rstrip("/")
    lus += 1
    if not existe(FIN, chemin):
        absents.append(c)
ctl("F1", f"chemins `docs/preuves/D324/…` et `P/…` cités par D324 (parcourus {lus}, globs/gabarits écartés {globs}) : absents à la clôture", [], absents)

# ── T : TEXTE — l'état courant ───────────────────────────────────────────────────────────────────────────────────────
print("\n== T — LE TEXTE : l'état courant que D324 a laissé")
registre = [l for l in TXT.split("\n") if re.match(r"^\| D\d+ \|", l)]
ctl("T1", "la dernière ligne du registre porte D324 (le prochain numéro est D325)", "D324", re.match(r"^\| (D\d+) \|", registre[-1])[1])
ordre = TXT[TXT.index("\n## ORDRE DES RANGS"):]
ordre = ordre[: ordre.index("\n## ", 10)]
suivants = re.findall(r"⇒ \*{0,2}RANG (\d+) : ([^*\n]{0,60})", ordre)
ctl("T2", "la dernière ligne « ⇒ RANG N » de l'ordre des rangs : rang 32, en attente d'arbitrage", ("32", "EN ATTENTE D'ARBITRAGE DE KO"), (suivants[-1][0], suivants[-1][1].strip().rstrip(" (D284)").strip()) if suivants else None)
ag = show(FIN, "AGENTS.md")
ctl("T3", "`AGENTS.md` : l'annotation de D324 (« rang 31 CLOS — LA CERTIFICATION PASSE », « compteur DEUX → ZÉRO ») est écrite", (True, True),
    ("rang 31 CLOS — LA CERTIFICATION PASSE" in ag, "compteur DEUX → ZÉRO** ⇒ « aucun lot de code ne s'ouvre avant une certification » est **LEVÉ" in aplati(ag)))
motifs = []
for l in show(FIN, f"{PD}/passe-d277/motifs.txt").split("\n"):
    if l and not l.startswith("#"):
        s, mo = l.split("|", 1)
        motifs.append((s, mo))
corpus = {f: aplati(show(FIN, f)) for f in ("CLAUDE.md", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md")}
n_fin = sum(corpus[f].count(mo) for s, mo in motifs if not s.startswith("T") for f in corpus)
ctrl = show(FIN, f"{PD}/passe-d277/balayage-controle.txt")
n_ctrl = int(re.search(r"OCCURRENCES DANS L'ARBRE : (\d+)", ctrl)[1])
ctl("T4", "la passe D277 de D324 : son contrôle (« rejouée sur l'état qui part ») compte les occurrences que le texte livré porte (comptées ICI de nouveau)", n_ctrl, n_fin)
ctl("T5", f"les motifs de la passe D277 examinés (hors témoins) : parcourus {len([1 for s, _ in motifs if not s.startswith('T')])} · le contrôle en annonce", int(re.search(r"motifs examinés (\d+)", ctrl)[1]), len([1 for s, _ in motifs if not s.startswith("T")]))
# Les occurrences « courant » de « compteur DEUX » dans les endroits où l'on LIT le courant (AGENTS.md, ordre des rangs, CLAUDE.md)
def courant(texte, motif):
    sortie = []
    for mo in re.finditer(re.escape(motif), texte):
        i = mo.start()
        deb = max(texte.rfind(" ## ", 0, i), texte.rfind("⛔", 0, i), 0)
        if texte.count("~~", deb, i) % 2 == 0:
            sortie.append(texte[max(0, i - 60): i + 90])
    return sortie
ordre_plat = aplati(ordre)
cour = {f: courant(ordre_plat if f == "ordre" else corpus[f], "compteur DEUX") for f in ("ordre", "AGENTS.md", "CLAUDE.md")}
non_annotees = {f: [c for c in v if not re.search(r"ZÉRO|LEVÉ|périmé|PÉRIMÉ|D32[34]", c)] for f, v in cour.items()}
constat("T6", "occurrences « compteur DEUX » non barrées dans les endroits où l'on lit le courant (ordre des rangs, `AGENTS.md`, `CLAUDE.md`), "
              f"dont le contexte de 150 car. ne porte ni « ZÉRO », ni « LEVÉ », ni « périmé », ni D323/D324 : { {f: len(v) for f, v in non_annotees.items()} } (sur { {f: len(v) for f, v in cour.items()} } non barrées)")
for f, v in non_annotees.items():
    for c in v:
        print(f"         {f} : …{c}…")

# ── X : L'ÉTAT LIVE (ce que la session a REÇU) ───────────────────────────────────────────────────────────────────────
print("\n== X — L'ÉTAT LIVE (lu en direct : c'est lui qui dit ce que la session a reçu)")
suivis = [l for l in git("status", "--short", "--untracked-files=no").decode().split("\n") if l]
ctl("X1", "fichiers SUIVIS modifiés à l'ouverture", [], suivis)
non_suivis = [l for l in git("status", "--short", "--untracked-files=all").decode().split("\n") if l.startswith("??")]
constat("X2", f"fichiers non suivis à cet instant : {non_suivis}")
ctl("X3", "HEAD = clôture de D324", rp(FIN), rp("HEAD"))
git("fetch", "--quiet", check=False)
ctl("X4", "HEAD = origin/main après `git fetch`", rp("HEAD"), rp("origin/main"))
stash = [l for l in git("stash", "list").decode().split("\n") if l]
ctl("X5", "un stash, celui de D323, message exact", ["stash@{0}: On main: D323 : 8 lignes de Ko, edit-venue-page.tsx, création de salle, 02/10"], stash)
ctl("X6", "l'identifiant du stash : 85a7f052e902835c943d78335a0d34ea1af5f39a", "85a7f052e902835c943d78335a0d34ea1af5f39a", rp("stash@{0}"))
diff_versé = show_octets(FIN, "docs/preuves/D323/arbre-sale/edit-venue-page.diff").replace(b"\r\n", b"\n")
diff_stash = git("stash", "show", "-p", "stash@{0}").replace(b"\r\n", b"\n")
ctl("X7", "le diff versé en pièce (D323) = le contenu du stash (octets, LF)", hashlib.sha256(diff_versé).hexdigest(), hashlib.sha256(diff_stash).hexdigest())
ctl("X8", "sha256 du diff versé = celui qu'écrit D323 (`9e6e03bc…`)", "9e6e03bce67fc524", hashlib.sha256(show_octets(FIN, "docs/preuves/D323/arbre-sale/edit-venue-page.diff")).hexdigest()[:16])
bloc = subprocess.run(["powershell", "-NoProfile", "-Command",
                       "(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3100,3101,5273,3000,3001,5173 } | Select-Object -ExpandProperty LocalPort) -join ','"],
                      capture_output=True).stdout.decode("utf-8", errors="replace").strip()
constat("X9", f"ports de développement ou d'e2e à l'écoute à cet instant (3000, 3001, 5173, 3100, 3101, 5273) : {bloc or 'aucun'} ; D324 dit que les serveurs de Ko étaient arrêtés pendant la passe")

# ══ SYNTHÈSE ═════════════════════════════════════════════════════════════════════════════════════════════════════════
print(f"\n== {len(controles)} contrôles · {len(ecarts)} écart(s) de D324 · {len(ecarts_live)} écart(s) de l'état live · {len(constats)} constat(s)")
print("ventilation par famille :", " · ".join(f"{k} {v}" for k, v in sorted(familles.items())), f"(somme {sum(familles.values())})")
if ecarts:
    print("ÉCARTS DE D324 :", ", ".join(ecarts))
if ecarts_live:
    print("ÉCARTS DE L'ÉTAT LIVE :", ", ".join(ecarts_live))
