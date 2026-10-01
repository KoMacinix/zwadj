"""D321 — lecture adverse de D320 (rang 28, lot documentaire), confrontée aux objets git à des SHA FIXÉS.

POURQUOI IL EXISTE
  La forme de Ko au rang 29 : « lecture adverse depuis la clôture de D320, en entier ». Aucun commit n'existe après
  celui de D320 (`b5bd382`) ; la dernière lecture adverse (D320) couvrait D317 à D319. La session la lit donc comme la
  lecture adverse de D320 lui-même — interprétation écrite au point d'entrée du rang 29.
  Chaque affirmation de D320 qui se vérifie dans le dépôt est confrontée à sa source : provenance, comptes de ses propres
  sorties, faits du cadrage (fichier:ligne), écarts relevés chez D317 à D319, annotations, rattachements, passe D277,
  audits, registre. Une affirmation qui ne vit que dans le chat (paroles de Ko) est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D321/lecture-adverse/confronter-d320.py > docs/preuves/D321/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, que ce
  lot modifie. Une seule exception, déclarée : le REJEU de `releve-admin.py` (D320), qui lit l'arbre — légitime parce
  qu'aucun fichier hors `.md` d'autorité et `docs/preuves/` n'a changé depuis `b5bd382` (contrôle T0, mesuré ici même).

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d317-d319.py` (D320) — il juge D317 à D319, pas D320 ; une lecture « à l'œil »
  des sections — elle rate les chiffres (écart 9 de D320 : « 2 324 » pour 2 325, transcrit au lieu d'être lu).

CALIBRATION, deux bras par famille de contrôle (D286) : chaque fonction de contrôle est jouée sur un SHA où le fait est
  connu VRAI et sur un SHA ou une chaîne où il est connu FAUX ; abandon si un bras manque.
"""
import hashlib
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

D320 = "b5bd382"   # commit de D320
AVANT = "a53943e"  # SHA de départ déclaré par D320 (commit de D319)
D315 = "ffd32e9"   # SHA où les « B:NNN » de D315 sont des numéros de ligne

controles, ecarts, constats = [], [], []


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, check=True).stdout


def show(sha, chemin):
    """Texte d'un fichier à un SHA, fins de ligne normalisées en LF (le dépôt stocke du LF ; les preuves, telles quelles)."""
    return git("show", f"{sha}:{chemin}").decode("utf-8").replace("\r\n", "\n")


def ligne(sha, chemin, n):
    return show(sha, chemin).split("\n")[n - 1]


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    if not ok:
        ecarts.append(ident)
    print(f"{'✓' if ok else '✗'} {ident:6} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:6} CONSTAT : {texte}")


def section_d320(sha=D320):
    t = show(sha, "ZWADJ_CONTINUITE.md")
    debut = t.index("## Session du 01/10/2026 — D320")
    fin = t.index("\n## ", debut + 10)
    return t[debut:fin]


def cadrage(sha=D320):
    t = show(sha, "ZWADJ_CONTINUITE.md")
    debut = t.index("## ⛔ CADRAGE DU RANG 28")
    fin = t.index("\n## ", debut + 10)
    return t[debut:fin]


def aplati(t):
    return re.sub(r"\s+", " ", t)


def derniere_ligne_registre(sha):
    lignes = [l for l in show(sha, "ZWADJ_CONTINUITE.md").split("\n") if re.match(r"^\| D\d{3} \|", l)]
    return lignes[-1].split("|")[1].strip()


def mots(t):
    return re.findall(r"[0-9A-Za-zÀ-ÿ]+", t.replace("~~", ""))


def mots_perdus(retire, ajoute):
    """Mots d'une ligne retirée absents des lignes ajoutées du même hunk — « aucun mot perdu » (D317)."""
    pool = set(mots(" ".join(ajoute)))
    return [m for m in mots(" ".join(retire)) if m not in pool]


def hunks(sha_a, sha_b, chemin):
    diff = git("diff", "-U0", sha_a, sha_b, "--", chemin).decode("utf-8").replace("\r\n", "\n")
    out, cur = [], None
    for l in diff.split("\n"):
        if l.startswith("@@"):
            cur = {"moins": [], "plus": []}
            out.append(cur)
        elif cur is not None and l.startswith("-") and not l.startswith("---"):
            cur["moins"].append(l[1:])
        elif cur is not None and l.startswith("+") and not l.startswith("+++"):
            cur["plus"].append(l[1:])
    return out


def comptes_balayage(t):
    """(motif, HEAD, arbre) par ligne « [sens N] « motif » — HEAD a → arbre b ». Défaut de la passe 1 : l'extracteur
    cherchait des nombres en tête de ligne et rendait [] des deux côtés — une égalité sur ZÉRO élément (D290)."""
    return re.findall(r"^\[sens [^\]]*\] « (.+?) » — HEAD (\d+) → arbre (\d+)", t, flags=re.M)


def lignes_occurrence(t):
    return [l for l in t.split("\n") if re.match(r"^   \S+\.md @\d+ \[", l)]


# Texte de l'entrée du backlog. Défaut de la passe 1 : l'instrument cherchait le mot « homonymie », que l'entrée n'emploie pas.
HOMONYMIE = "« D4 » désigne deux décisions différentes"
# Défaut de la passe 2 : « data: { role: "ADMIN" } » exigeait l'accolade fermante et manquait les `update` qui posent
# AUSSI `emailVerifiedAt` (rbac ×2, venues-pro). Le préfixe suffit ; `.send({ role: "ADMIN"` (une inscription REFUSÉE)
# n'en est pas une — bras négatif ci-dessous.
FABRIQUE = re.compile(r"SET role = 'ADMIN'|data: \{ role: \"ADMIN\"")
FABRIQUE_D320 = re.compile(r"role ?= ?'ADMIN'|role: ?\"ADMIN\"")  # la définition de releve-admin.py:126, recopiée pour COMPARER


def fabrications(sha):
    """Fabrications d'un ADMIN hors produit, LES DEUX FORMES que D320 comptait — SQL brut et
    `prisma.user.update(… role: "ADMIN" …)`. Défaut de la passe 1 : la forme SQL seule."""
    noms = [n for n in git("ls-tree", "-r", "--name-only", sha, "apps/api/test", "apps/api/prisma", "e2e").decode().split()
            if n.endswith(".ts")]
    par = {n: len(FABRIQUE.findall(show(sha, n))) for n in noms}
    return {n: k for n, k in par.items() if k}, len(noms)


# ── CALIBRATION ─────────────────────────────────────────────────────────────────────────────────────────────────────
print("== CALIBRATION — deux bras par famille, abandon si un seul manque")
bras = [
    ("registre, positif", derniere_ligne_registre(D320), "D320"),
    ("registre, négatif (SHA de départ)", derniere_ligne_registre(AVANT), "D319"),
    ("annotation « (D320, » dans AGENTS.md, positif", show(D320, "AGENTS.md").count("(D320, 01/10/2026"), 4),
    ("annotation « (D320, » dans AGENTS.md, négatif", show(AVANT, "AGENTS.md").count("(D320, 01/10/2026"), 0),
    ("fichier:ligne, positif (env.spec.ts:20 porte 15m)", "15m" in ligne(D320, "apps/api/src/config/env.spec.ts", 20), True),
    ("fichier:ligne, négatif (env.spec.ts:19)", "15m" in ligne(D320, "apps/api/src/config/env.spec.ts", 19), False),
    ("mot perdu, positif (synthétique)", mots_perdus(["un mot disparu"], ["un mot"]), ["disparu"]),
    ("mot perdu, négatif (barré)", mots_perdus(["un mot gardé"], ["~~un mot gardé~~ annoté"]), []),
    # Bras ajoutés après la passe 1 (D298 : recalibrer l'instrument réparé, y compris sur les bras qu'il n'avait pas).
    ("comptes de balayage, positif (synthétique)", comptes_balayage("[sens 1] « X » — HEAD 4 → arbre 5 (a 1→2)\n"),
     [("X", "4", "5")]),
    ("comptes de balayage, négatif (ligne d'occurrence seule)", comptes_balayage("   A.md @1 [courant] « X »\n"), []),
    ("homonymie D4 au backlog, positif (b5bd382)", HOMONYMIE in show(D320, "ZWADJ_BACKLOG.md"), True),
    ("homonymie D4 au backlog, négatif (a53943e)", HOMONYMIE in show(AVANT, "ZWADJ_BACKLOG.md"), False),
    ("fabrications d'ADMIN, positif (deux formes)", len(FABRIQUE.findall("SET role = 'ADMIN' · data: { role: \"ADMIN\" }")), 2),
    ("fabrications d'ADMIN, négatif", len(FABRIQUE.findall("data: { role: \"PRO\" } · SET role = 'PRO'")), 0),
    ("fabrications d'ADMIN, positif multi-champs (ajouté passe 3)",
     len(FABRIQUE.findall("data: { role: \"ADMIN\", emailVerifiedAt: new Date() }")), 1),
    ("fabrications d'ADMIN, négatif : inscription REFUSÉE (ajouté passe 3)",
     len(FABRIQUE.findall(".send({ role: \"ADMIN\", email: \"root@zwadj.dz\" })")), 0),
]
manques = 0
for nom, mesure, attendu in bras:
    ok = mesure == attendu
    manques += not ok
    print(f"  calibration {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")
print(f"  calibration : {len(bras)} bras · {manques} manqué(s) (attendu 0)")
if manques:
    sys.exit("ABANDON : un bras de calibration manque — rien n'est confronté.")

# ── T0 · provenance ─────────────────────────────────────────────────────────────────────────────────────────────────
print("\n== P — provenance de D320")
ctl("P1", "parent de b5bd382 = SHA de départ déclaré", AVANT, git("rev-parse", "--short=7", f"{D320}^").decode().strip())
noms = git("show", "--name-only", "--format=", D320).decode().split()
hors = [n for n in noms if not (n in ("AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md") or n.startswith("docs/preuves/D320/"))]
ctl("P2", f"fichiers du commit hors .md d'autorité et docs/preuves/D320 ({len(noms)} examinés)", [], hors)
ctl("P3", "pièces versées sous docs/preuves/D320/", 22, sum(n.startswith("docs/preuves/D320/") for n in noms))
apres = git("log", "--format=%h", f"{D320}..HEAD").decode().split()
ctl("P4", "commits après b5bd382 (« depuis la clôture de D320 »)", [], apres)
code = [n for n in git("diff", "--name-only", D320).decode().split()
        if not (n.endswith(".md") and "/" not in n) and not n.startswith("docs/preuves/")]
ctl("T0", "fichiers hors .md d'autorité / docs/preuves changés depuis b5bd382 dans l'arbre (préalable au rejeu)", [], code)

# ── S · comptes de ses propres sorties ──────────────────────────────────────────────────────────────────────────────
print("\n== S — D320 contre ses propres sorties")
sortie = show(D320, "docs/preuves/D320/lecture-adverse/confronter-sortie.txt")
derniere = [l for l in sortie.split("\n") if "contrôles ·" in l][-1]
ctl("S1", "« 104 contrôles · 9 écarts · 7 constats » (dernière ligne de sa sortie)",
    ("104", "9", "7"), tuple(re.search(r"(\d+) contrôles · (\d+) écart\(s\) · (\d+) constat", derniere).groups()))
ctl("S2", "lignes ✓ / ✗ / · de sa sortie (95 + 9 = 104)",
    (95, 9, 7), tuple(sum(1 for l in sortie.split("\n") if l.startswith(c)) for c in ("✓", "✗", "·")))
ctl("S3", "calibration « 7 bras, 0 manqué »", True, "calibration : 7 bras · 0 manqué(s)" in sortie)
ctl("S4", "« les 16 concordent » : empreintes de journaux bruts confrontées", 16,
    sum(1 for l in sortie.split("\n") if l.startswith("✓ BRUT  empreinte")))
ctl("S5", "aucune empreinte en écart", 0, sum(1 for l in sortie.split("\n") if l.startswith("✗ BRUT")))
ctl("S6", "contrôle T0 « 189 fichiers examinés »", True, "(189 examinés)" in sortie)
passes = [n for n in noms if "confronter-sortie" in n]
ctl("S7", "faute n° 4 : la passe 3 n'est pas versée (passe1, passe2, finale seulement)", 3, len(passes))
ctl("S8", "écart 9 de D320 : la pièce de D319 dit 2325 fichiers",
    True, "parcourus : 2325 fichiers" in show(D320, "docs/preuves/D319/passe-r27a-20261001-0155/aucune-valeur-reelle.txt"))

# Écart 8 de D320, RE-DÉRIVÉ indépendamment de son instrument : rapport et marge mur/plancher par harnais.
lc = show(D320, "docs/preuves/D319/passe-r27a-20261001-0155/lecture-campagnes.txt")
rangs = []
for l in lc.split("\n"):
    m = re.match(r"^(\S+)\s+--\S+.*?(\d+(?:\.\d+)?) s ≥ plancher (\d+(?:\.\d+)?) s", l)
    if m:
        mur, pl = float(m.group(2)), float(m.group(3))
        rangs.append((m.group(1), mur / pl, mur - pl))
plus_serre_r = min(rangs, key=lambda r: r[1])[0]
plus_serre_m = min(rangs, key=lambda r: r[2])[0]
ctl("S9", f"écart 8 de D320 re-dérivé : plus serré par rapport et par marge ({len(rangs)} harnais à plancher)",
    ("booking-status", "booking-status"), (plus_serre_r, plus_serre_m))
ctl("S10", "… et e3d1-s8 n'est PAS le plus serré (rapport ≈ 9,5)", True,
    9.4 < next(r[1] for r in rangs if r[0] == "e3d1-s8") < 9.6)

# ── E · les écarts relevés chez D317 à D319, re-vérifiés à leur source ──────────────────────────────────────────────
print("\n== E — écarts de D320 re-vérifiés à leur source (au SHA de départ)")
ag = show(AVANT, "AGENTS.md")
pas_admin = [l for l in ag.split("\n") if "pas d'app admin" in l and l.startswith("- Ne pas introduire")]
ctl("E4", "écart 4 : à a53943e, « pas d'app admin » (À NE PAS faire) sans annotation", (1, False),
    (len(pas_admin), "(D318" in pas_admin[0] if pas_admin else None))
cont_avant = show(AVANT, "ZWADJ_CONTINUITE.md")
mr = cont_avant[cont_avant.index("## ⛔ E3 — MÉTHODE RENFORCÉE"):] if "## ⛔ E3 — MÉTHODE RENFORCÉE" in cont_avant else ""
ctl("E5", "écart 5 : à a53943e, aucun bloc « (D318) » dans la méthode renforcée", 0,
    len(re.findall(r"^#+ .*\(D318\)", mr, flags=re.M)) if mr else -1)
d318_passe = [n for n in git("ls-tree", "-r", "--name-only", AVANT, "docs/preuves/D318").decode().split() if "passe-d277" in n]
ctl("E3", "écart 3 : D318 n'a versé aucune passe D277", [], d318_passe)
s319 = show(AVANT, "ZWADJ_CONTINUITE.md")
i = s319.index("## Session du 01/10/2026 — D319")
s319 = s319[i:s319.index("\n## ", i + 10)]
ctl("E7", "écart 7 : la section D319 ne porte pas « lecture adverse »", 0, aplati(s319).lower().count("lecture adverse"))

# ── C · faits du cadrage, fichier:ligne, à b5bd382 ──────────────────────────────────────────────────────────────────
print("\n== C — faits de l'état des lieux (cadrage du rang 28, § 1), ligne par ligne à b5bd382")
faits = [
    ("C1", "app.module.ts:65-67 — trois gardes globales dans l'ordre", "apps/api/src/app.module.ts",
     [(65, "ThrottlerGuard"), (66, "JwtAuthGuard"), (67, "RolesGuard")]),
    ("C2", "account-admin.controller.ts:25 — @Roles(ADMIN) de classe", "apps/api/src/account/account-admin.controller.ts",
     [(25, "@Roles(UserRole.ADMIN)")]),
    ("C3", "venues-admin.controller.ts:18 — @Roles(ADMIN) de classe", "apps/api/src/venues/venues-admin.controller.ts",
     [(18, "@Roles(UserRole.ADMIN)")]),
    ("C4", "auth.types.ts:4 — claims du jeton (D4)", "apps/api/src/auth/auth.types.ts", [(4, "(D4)")]),
    ("C5", "jwt-auth.guard.ts:40-45 — signature vérifiée, user posé sans base", "apps/api/src/auth/jwt-auth.guard.ts",
     [(40, "verifyAsync"), (45, "request.user = { userId: payload.sub, role: payload.role }")]),
    ("C6", "roles.guard.ts:43 — comparaison du rôle", "apps/api/src/auth/roles.guard.ts", [(43, "requiredRoles.includes(user.role)")]),
    ("C7", "env.spec.ts:20 — JWT_ACCESS_TTL « 15m »", "apps/api/src/config/env.spec.ts", [(20, '"15m"')]),
    ("C8", "auth.service.ts:538 — rafraîchissement : statut non ACTIVE ⇒ 401", "apps/api/src/auth/auth.service.ts",
     [(538, 'user.status !== "ACTIVE"')]),
    ("C9", "auth.service.ts:580 — rafraîchissement : rôle relu", "apps/api/src/auth/auth.service.ts", [(580, "role: user.role")]),
    ("C10", "auth.constants.ts:9-11 — cookie zwadj_rt, chemin /api/v1/auth", "apps/api/src/auth/auth.constants.ts",
     [(9, '"zwadj_rt"'), (11, '"/api/v1/auth"')]),
    ("C11", "auth.controller.ts:222-225 — httpOnly, lax, sans domain", "apps/api/src/auth/auth.controller.ts",
     [(222, "httpOnly: true"), (223, 'sameSite: "lax"'), (225, "path:")]),
    ("C12", "main.ts:23 — CORS par liste, credentials", "apps/api/src/main.ts", [(23, "credentials: true")]),
    ("C13", "env.ts:16 — origines par défaut", "apps/api/src/config/env.ts", [(16, "http://localhost:3000,http://localhost:5173")]),
    ("C14", "require-pro.tsx:31 — l'app Pro refuse tout rôle ≠ PRO (D23)", "apps/pro/src/auth/require-pro.tsx", [(31, 'user.role !== "PRO"')]),
    ("C15", "i18n-parity.spec.ts:95 — plancher ≥ 943", "apps/api/src/common/i18n-parity.spec.ts", [(95, "943")]),
]
for ident, libelle, chemin, attendus in faits:
    lus = [(n, frag in ligne(D320, chemin, n)) for n, frag in attendus]
    ctl(ident, libelle, [(n, True) for n, _ in attendus], lus)

# Faits qui ne sont pas un fichier:ligne, recomptés.
src = show(D320, "apps/api/src/auth/auth.service.ts").split("\n")
ctl("C16", "auth.service.ts:278 — un ADMIN non vérifié ne se connecte pas (D1)", True,
    any("ADMIN" in l or "emailVerified" in l or "email_verified" in l.lower() for l in src[270:285]))
ctl("C17", "auth.service.ts:360 — Google ne crée jamais un ADMIN", True,
    any("ADMIN" in l or "CLIENT" in l for l in src[352:368]))
enum = show(D320, "apps/api/src/venues/venues-admin.service.ts").split("\n")
ctl("C18", "venues-admin.service.ts:45 — PENDING « inutilisé au MVP, verrouillé »", True,
    "PENDING" in enum[44] and "verrouill" in aplati(" ".join(enum[42:48])))
fab, parcourus = fabrications(D320)
ctl("C19", f"« harness.ts:330 et 16 autres » : fabrications d'un ADMIN, deux formes ({parcourus} fichiers parcourus)", 17,
    sum(fab.values()))
fab320 = {n: len(FABRIQUE_D320.findall(show(D320, n))) for n in fab | {"apps/api/test/int/register.int-spec.ts": 0}}
constat("C19d", f"la définition de D320 (`releve-admin.py:126`) rend {sum(fab320.values())} : elle compte aussi "
        "`register.int-spec.ts:143`, `.send({ role: \"ADMIN\" … })` — le test qui prouve que l'inscription REFUSE le rôle "
        f"ADMIN (400). Fabrications réelles : {sum(fab.values())} ⇒ « harness.ts:330 et {sum(fab.values()) - 1} autres »")
sql_seul = sum(show(D320, n).count("SET role = 'ADMIN'") for n in fab)
constat("C19c", f"la FORME écrite au cadrage (« les tests font `UPDATE users SET role = 'ADMIN'` ») n'est littérale que "
        f"{sql_seul} fois sur {sum(fab.values())} ; les autres passent par `prisma.user.update(… role: \"ADMIN\" …)`, qui "
        "émet le même UPDATE — la forme est approximative")
ctl("C19b", "… dont e2e/fixtures/harness.ts:330", True, "SET role = 'ADMIN'" in ligne(D320, "e2e/fixtures/harness.ts", 330))
fr = show(D320, "packages/i18n/messages/fr.json")
ar = show(D320, "packages/i18n/messages/ar.json")
import json  # noqa: E402

def plat(d, p=""):
    out = {}
    for k, v in d.items():
        q = f"{p}.{k}" if p else k
        out.update(plat(v, q) if isinstance(v, dict) else {q: v})
    return out

pf, pa = plat(json.loads(fr)), plat(json.loads(ar))
ctl("C20", "parité « 1 095 = 1 095 », 0 clé admin.*", (1095, 1095, 0),
    (len(pf), len(pa), sum(k.startswith("admin.") for k in pf)))
ac = [n for n in git("ls-tree", "-r", "--name-only", D320, "packages/api-client/src").decode().split()
      if n.endswith(".ts") and not n.endswith(".test.ts")]
ctl("C21", f"« 0 méthode /admin dans @zwadj/api-client » ({len(ac)} fichiers source)", 0,
    sum(show(D320, n).count("/admin") for n in ac))
api_src = [n for n in git("ls-tree", "-r", "--name-only", D320, "apps/api/src").decode().split()
           if re.search(r"\.tsx?$", n) and not re.search(r"\.(spec|test|int-spec)\.tsx?$", n) and "/generated/" not in n]
ecrivains = [n for n in api_src if re.search(r"auditLog\.(create|createMany|upsert)", show(D320, n))]
ctl("C22", f"AuditLog : 0 écrivain dans apps/api/src ({len(api_src)} fichiers source parcourus ; D320 : 111)", (111, []),
    (len(api_src), ecrivains))
ctl("C23", "0 proxy dans next.config.ts et vite.config.ts", (0, 0),
    (show(D320, "apps/client/next.config.ts").count("rewrites"), show(D320, "apps/pro/vite.config.ts").count("proxy")))

# Rejeu de l'instrument de D320 (lecture de l'arbre, légitime par T0).
rejeu = subprocess.run([sys.executable, "docs/preuves/D320/etat-des-lieux/releve-admin.py"], capture_output=True)
verse = show(D320, "docs/preuves/D320/etat-des-lieux/releve-admin-sortie.txt")
ctl("C24", "releve-admin.py REJOUÉ : sortie identique à la pièce versée (fins de ligne normalisées)", True,
    rejeu.stdout.decode("utf-8").replace("\r\n", "\n") == verse)

# ── A · partie A de D320 : décision du relecteur, rattachements ─────────────────────────────────────────────────────
print("\n== A — partie A de D320 : ce qui devait atterrir, et où")
cont = show(D320, "ZWADJ_CONTINUITE.md")
mr320 = cont[cont.index("## ⛔ E3 — MÉTHODE RENFORCÉE"):]
ctl("A1", "bloc D320 dans la méthode renforcée (taux en lecture seule)", True,
    bool(re.search(r"D320.{0,400}LECTURE SEULE", aplati(mr320[:400000]))))
ctl("A2", "AGENTS.md, point E3 : décision du relecteur D320", 1,
    show(D320, "AGENTS.md").count("DÉCISION DU RELECTEUR (chat), DÉLÉGUÉE PAR KO LE 01/10/2026 (D320)"))
bl = show(D320, "ZWADJ_BACKLOG.md")
bl15 = show(D315, "ZWADJ_BACKLOG.md").split("\n")
ctl("A3", "B:728 — la ligne de ffd32e9 est le DÉBUT de celle de b5bd382 (« inchangée depuis », renvoi de D320 ajouté)",
    True, bl.split("\n")[727].startswith(bl15[727].rstrip()) and "B4 devra DIRE" in bl15[727])
constat("A3c", "D320 écrit « ligne 728, inchangée depuis ffd32e9 » et, dans le même commit, ajoute son renvoi à cette "
        "ligne : la position et l'entrée tiennent, le texte n'est plus identique (défaut de la passe 1 de CET instrument)")
quatre = ["audit SOLID 09/09 · F7", "Remonter `QuotesSection`", "Implement pending-request expiration job",
          "B4 devra DIRE au pro"]
for k, cle in enumerate(quatre, 1):
    lignes = bl.split("\n")
    i = next(j for j, l in enumerate(lignes) if cle in l)
    bloc = aplati(" ".join(lignes[i:i + 30]))
    ctl(f"A4.{k}", f"entrée « {cle[:34]}… » : renvoi D320 dans son entrée", True, "D320" in bloc[: bloc.find("- [", 10) if bloc.find("- [", 10) > 0 else None])
e3d2 = aplati(bl[bl.index("E3d-2"):bl.index("E3d-2") + 1500])
ctl("A5", "E3d-2 porte sur le paiement (« Chargily » ou « paiement » dans son entrée)", True,
    "Chargily" in e3d2 or "paiement" in e3d2.lower())
ec = show(D320, "docs/preuves/D315/etat-produit/ENTREES-CONFRONTEES.md").split("\n")
ctl("A6", "ENTREES-CONFRONTEES.md:184 cite les points rattachés", True, "B:" in ec[183])
ctl("A7", "homonymie « D4 » rapportée au backlog (entrée « « D4 » désigne deux décisions différentes »)", True,
    HOMONYMIE in bl)

# ── W · les écritures de D320 n'ont rien réécrit (aucun mot perdu) ─────────────────────────────────────────────────
print("\n== W — aucun mot perdu dans les lignes que D320 a modifiées")
for chemin in ("ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"):
    hs = hunks(AVANT, D320, chemin)
    retires = sum(len(h["moins"]) for h in hs)
    perdus = [m for h in hs if h["moins"] for m in mots_perdus(h["moins"], h["plus"])]
    ctl(f"W.{chemin[:5]}", f"{chemin} : {retires} ligne(s) retirée(s), mots perdus", [], perdus)

# ── D · passe D277 de D320 ──────────────────────────────────────────────────────────────────────────────────────────
print("\n== D — passe D277 de D320")
b320 = git("show", f"{D320}:docs/preuves/D320/passe-d277/balayage.py")
b317 = git("show", f"{D320}:docs/preuves/D317/passe-d277/balayage.py")
ctl("D1", "balayage.py : copie à l'octet de celui de D317 (empreinte 24802faf…)",
    (True, True), (b320 == b317, hashlib.sha256(b320).hexdigest().startswith("24802faf")))
motifs = [l for l in show(D320, "docs/preuves/D320/passe-d277/motifs.txt").split("\n") if l.strip() and not l.startswith("#")]
ctl("D2", f"motifs.txt : « 21 + 2 témoins » ({len(motifs)} lignes non vides lues)", (21, 2), (sum(not m.startswith("T") for m in motifs), sum(m.startswith("T") for m in motifs)))
print(f"         {[m[:30] for m in motifs]}")
b1 = show(D320, "docs/preuves/D320/passe-d277/balayage-1.txt")
ctl("D3", f"balayage-1 : « 62 occurrences » (lignes d'occurrence ; {len(comptes_balayage(b1))} motifs lus)", 62,
    len(lignes_occurrence(b1)))
apres_e = show(D320, "docs/preuves/D320/passe-d277/balayage-apres-ecriture.txt")
ctrl = show(D320, "docs/preuves/D320/passe-d277/balayage-controle.txt")
ca, cc = comptes_balayage(apres_e), comptes_balayage(ctrl)
ctl("D4", f"balayage-controle = balayage-apres-ecriture, motif par motif ({len(ca)} et {len(cc)} motifs lus, > 0 exigé)",
    (True, ca), (len(ca) > 0, cc))

# ── X · contrôles d'audit de D320 ───────────────────────────────────────────────────────────────────────────────────
print("\n== X — audits et contrôles de D320")
tri = show(D320, "docs/preuves/D320/controles/tri-audit-final.txt")
ctl("X1", "tri final : 151 → 151, 0 alerte neuve", ("151", "151", "0"),
    (re.search(r"précédente .*?\((\d+) contextes\)", tri).group(1), re.search(r"nouvelle .*?\((\d+) contextes\)", tri).group(1),
     re.search(r"ABSENTES de la précédente : (\d+)", tri).group(1)))
avr = show(D320, "docs/preuves/D320/controles/aucune-valeur-reelle-final.txt")
m = re.search(r"valeurs cherchées : (\d+) \((\d+) journal.*?parcourus : (\d+) fichiers.*?porteurs : (\d+)", avr)
ctl("X2", "« 0 valeur réelle » final : 63 valeurs (39 + 4 × 6), 5 journaux, 0 porteur", ("63", "5", "0"),
    (m.group(1), m.group(2), m.group(4)))
constat("X3", f"« 0 valeur réelle » final : {m.group(3)} fichiers parcourus — D320 n'écrit pas ce nombre dans sa section")
ctl("X4", "audit-secrets-final.txt porte un SCEAU (sortie scellée, D298)", True,
    "== SCEAU sha256:" in show(D320, "docs/preuves/D320/audit-secrets-final.txt"))

# ── R · registre, ordre des rangs, point d'entrée ───────────────────────────────────────────────────────────────────
print("\n== R — registre, ordre, point d'entrée")
ctl("R1", "dernière ligne du registre à b5bd382", "D320", derniere_ligne_registre(D320))
ctl("R2", "ordre des rangs : « RANG 29 : EN ATTENTE D'ARBITRAGE DE KO » présent à b5bd382", True,
    "RANG 29 : EN ATTENTE D'ARBITRAGE DE KO" in cont)
ctl("R3", "titre du rang 28 « CLOS LE 01/10/2026 : D320 »", True,
    bool(re.search(r"^## ~~PROCHAIN LOT~~ — rang 28 .*CLOS LE 01/10/2026 : D320", cont, flags=re.M)))
ctl("R4", "décisions D-1 à D-11 écrites au cadrage, § 5", [f"D-{k}" for k in range(1, 12)],
    [f"D-{k}" for k in range(1, 12) if f"**D-{k} ·" in cadrage()])
ctl("R5", "cadrage : « aucune recommandation » (« recommande » hors citation de Ko)", 0,
    len([x for x in re.findall(r"[^.]*recommand[^.]*", aplati(cadrage())) if "relecteur recommande" not in x and "ne recommande rien" not in x and "Aucune recommandation" not in x]))
constat("N1", "NON VÉRIFIABLE dans le dépôt : les paroles de Ko rapportées au § 0 du cadrage (« français seul », « sans "
        "mot de passe par défaut », rejet = décision produit) — elles vivent dans le chat")

print(f"\n{len(controles)} contrôles · {len(ecarts)} écart(s) · {len(constats)} constat(s) "
      f"(attendu : ce que la lecture trouve — chaque ✗ se lit à son contexte)")
