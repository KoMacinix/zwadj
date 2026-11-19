#!/usr/bin/env python3
"""Contrôle de FIN DE LOT — D352 (rang 54) — règles de `AGENTS.md` : D288 (local et `origin/main` sur le MÊME SHA, vérifié et rapporté), D328 (l'ordre des commits d'un lot est fixé, et c'est `git` qui le prouve), D334 point 5 (les rouges AVANT le code).
Chaque contrôle rend ce qu'il a PARCOURU à côté de son verdict et l'ATTENDU à côté du mesuré (D290). Lecture seule : aucun fichier n'est écrit, sauf `--sortie` (UTF-8, LF, écrit par le script lui-même, jamais par redirection — D298).
Usage, depuis la racine, APRÈS la poussée : python3 docs/preuves/D352/controle-fin-de-lot.py [--sortie <chemin>]  (il fait `git fetch` : une lecture du distant).

INSTRUMENT ÉCARTÉ : réutiliser `docs/preuves/D351/controle-fin-de-lot.py` — collé à la fusion de `par-carte` (la branche, les commits importés, le repère de parité). Les PRINCIPES sont repris : `--first-parent` pour les commits du lot (les commits d'une branche importée n'en sont pas), l'attendu à côté du mesuré, la calibration ci-dessous.
CALIBRATION (D286) : le contrôle d'ordre est essayé sur un cas où la réponse est connue — la table d'ouverture (premier commit) est APRÈS la consigne (qui n'est pas dans la table de départ) : doit rendre « faux » ; et sur lui-même : « vrai »."""
import hashlib
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "95b68af01273fd40140089a2c1320ba1ae775016"
TABLE = "docs/preuves/D352/table-ouverture.md"
AUTORITE = ("ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md")
BRANCHES = {"front-client": "43996e2", "integration-45": "63511ce", "par-carte": "7fdc679"}
SORTIE = sys.argv[sys.argv.index("--sortie") + 1] if "--sortie" in sys.argv else None


def git(*a):
    return subprocess.run(["git", *a], capture_output=True).stdout.decode("utf-8", errors="replace")


L, verdicts = [], []


def v(ident, enonce, ok, detail):
    verdicts.append(ok)
    L.append(f"{'✓' if ok else '✗'} [{ident}] {enonce}")
    L.append(f"     ↳ {detail}")


git("fetch", "origin")
head, origin = git("rev-parse", "HEAD").strip(), git("rev-parse", "origin/main").strip()
commits = [l.split(" ", 1) for l in git("log", "--first-parent", "--reverse", "--format=%H %s", f"{DEPART}..HEAD").splitlines()]
rang = {sha: i for i, (sha, _) in enumerate(commits)}
importes = int(git("rev-list", "--count", f"{DEPART}..HEAD").strip()) - len(commits)


def premier_ajout(chemin):
    """Le premier commit (du lot) qui AJOUTE `chemin`."""
    r = git("log", "--first-parent", "--diff-filter=A", "--reverse", "--format=%H", f"{DEPART}..HEAD", "--", chemin).split()
    return r[0] if r else None


def premier_commit_ou_le_texte_entre_dans_la_table(texte):
    r = git("log", "--first-parent", "--reverse", "--format=%H", "-S" + texte, f"{DEPART}..HEAD", "--", TABLE).split()
    return r[0] if r else None


# CALIBRATION du contrôle d'ordre
c1, c2 = premier_ajout("docs/preuves/D352/consigne.md"), premier_ajout(TABLE)
cal_ok = c1 is not None and c2 is not None and rang[c2] < rang[c1] and not (rang[c1] < rang[c2])
L.append(f"calibration : la table ({c2[:7] if c2 else None}) précède la consigne ({c1[:7] if c1 else None}) : {rang[c2] < rang[c1] if c1 and c2 else None} (attendu vrai) ; la consigne précède la table : {rang[c1] < rang[c2] if c1 and c2 else None} (attendu faux)")
if not cal_ok:
    L.append("✗ ABANDON : la calibration du contrôle d'ordre a manqué son verdict")
    print("\n".join(L))
    sys.exit(2)

# 1. le premier commit du lot : la table, SEULE
premier = commits[0][0]
fp = [l for l in git("show", "--name-only", "--format=", premier).splitlines() if l.strip()]
v("1", "le PREMIER commit du lot ne contient que `docs/preuves/D352/table-ouverture.md`", fp == [TABLE], f"{len(commits)} commits du lot (--first-parent) ; {importes} commit(s) importé(s) ; premier = {premier[:7]} ; fichiers : {fp}")

# 2. le diff final est inclus dans la table (chemins COMPLETS, extensions comprises)
table = git("show", f"HEAD:{TABLE}")
declares = set()
for bloc in re.findall(r"```\n(.*?)\n```", table, re.S):
    declares |= {l.strip() for l in bloc.split("\n") if l.strip() and "/" in l or l.strip() in AUTORITE}
declares |= {m for m in re.findall(r"`((?:apps|packages|docs|e2e|neutralisation)/[^`\s*]+)`", table) if not m.endswith("/")}
# CALIBRATION du contrôle de déclaration (D286) : un chemin du lot, connu, est déclaré (vrai) ; un chemin qui n'est pas du lot, connu, ne l'est pas (faux) — sans quoi « 0 non déclaré » serait vrai de n'importe quelle liste.
cal_decl = ("apps/pro/src/venues/venue-list-page.tsx" in declares, "apps/api/src/main.ts" in declares)
L.append(f"calibration : `venue-list-page.tsx` déclaré : {cal_decl[0]} (attendu vrai) ; `apps/api/src/main.ts` déclaré : {cal_decl[1]} (attendu faux) ; chemins déclarés lus : {len(declares)}")
if cal_decl != (True, False):
    L.append("✗ ABANDON : la calibration du contrôle de déclaration a manqué son verdict")
    print("\n".join(L))
    sys.exit(2)
diff = [l for l in git("diff", "--name-only", f"{DEPART}..HEAD").splitlines() if l.strip()]
non_declares = sorted(f for f in diff if f not in declares)
v("2", "`git diff <SHA de départ>..HEAD --name-only` ⊆ la table (chemins COMPLETS, extensions comprises)", not non_declares, f"{len(diff)} fichiers modifiés depuis le départ ; {len(declares)} chemins déclarés ; NON déclarés : {len(non_declares)} {non_declares[:8]} (attendu 0)")

# 3. la lecture adverse précède TOUT .md d'autorité
la = premier_ajout("docs/preuves/D352/lecture-adverse/confronter-sortie.txt")
auth = [rang[premier_ajout(f) or c] if False else None for f in AUTORITE]
premier_auth = next((sha for sha, _ in commits if any(f in git("show", "--name-only", "--format=", sha).splitlines() for f in AUTORITE)), None)
v("3", "la sortie de la lecture adverse entre dans un commit ANTÉRIEUR au premier commit qui touche un `.md` d'autorité", la is not None and premier_auth is not None and rang[la] < rang[premier_auth],
  f"lecture adverse : {la[:7] if la else None} (#{rang.get(la)}) ; premier commit d'autorité : {premier_auth[:7] if premier_auth else None} (#{rang.get(premier_auth)})")

# 4. les arbitrages de Ko en PREMIÈRE écriture d'autorité
diff_auth = git("show", premier_auth, "--", "ZWADJ_CONTINUITE.md") if premier_auth else ""
v("4", "la première écriture d'autorité porte l'arbitrage de Ko (bloc « ARBITRÉ LE 18/11/2026 PAR KO — LE RANG 54 ») et la table recopiée", "ARBITRÉ LE 18/11/2026 PAR KO — LE RANG 54" in diff_auth and "TABLE D'OUVERTURE DU RANG 54 (D352)" in diff_auth,
  f"commit {premier_auth[:7] if premier_auth else None} ; bloc d'arbitrage dans le diff : {'ARBITRÉ LE 18/11/2026 PAR KO — LE RANG 54' in diff_auth} ; table recopiée : {'TABLE D' + chr(39) + 'OUVERTURE DU RANG 54 (D352)' in diff_auth}")

# 5. chaque extension de la table précède le commit du fichier qu'elle couvre
exts = [(m.start(), m.group(0)) for m in re.finditer(r"### Extension \d+ —", table)]
echecs, examines = [], 0
for chemin in diff:
    if chemin == TABLE:
        continue
    ajout = premier_ajout(chemin)
    if ajout is None:
        continue
    examines += 1
    entree = premier_commit_ou_le_texte_entre_dans_la_table(chemin)
    if entree is None:
        # un chemin déclaré à l'OUVERTURE (section B) : il figure dans le premier commit de la table
        entree = premier
    if rang[entree] > rang[ajout]:
        echecs.append((chemin, entree[:7], ajout[:7]))
v("5", "chaque fichier du lot est déclaré dans la table AVANT (ou dans) le commit qui l'ajoute — l'extension précède le fichier qu'elle couvre", not echecs,
  f"{examines} fichiers ajoutés examinés, {len(exts)} extensions ; en retard : {len(echecs)} {echecs[:4]} (attendu 0)")

# 6. D334 point 5 : les pièces des rouges précèdent le premier commit de code
code_r1 = premier_ajout("apps/pro/src/test-support/native-presence.ts")
premiers_codes = [c for c in [git("log", "--first-parent", "--reverse", "--format=%H", f"{DEPART}..HEAD", "--", "apps/pro/src/venues/venue-list-page.tsx").split()[0:1]] if c]
code_commit = premiers_codes[0][0] if premiers_codes else None
rouge = premier_ajout("docs/preuves/D352/rouges/rouges.md")
v("6", "les pièces des rouges de R-1 entrent dans un commit ANTÉRIEUR au premier commit de code (D334, point 5)", rouge is not None and code_commit is not None and rang[rouge] < rang[code_commit],
  f"rouges : {rouge[:7] if rouge else None} (#{rang.get(rouge)}) ; premier commit de code (`venue-list-page.tsx`) : {code_commit[:7] if code_commit else None} (#{rang.get(code_commit)})")
r50_fix = git("log", "--first-parent", "--reverse", "--format=%H", f"{DEPART}..HEAD", "--", "e2e/specs/r50-salle-publiee.e2e.ts").split()
rouge_e2e = premier_ajout("docs/preuves/D352/mesures/e2e-latence-rouge.txt")
v("6b", "le rouge de l'e2e sous latence entre AVANT le correctif du spec `r50`", bool(r50_fix) and rouge_e2e is not None and rang[rouge_e2e] < rang[r50_fix[0]], f"rouge e2e : {rouge_e2e[:7] if rouge_e2e else None} (#{rang.get(rouge_e2e)}) ; correctif : {r50_fix[0][:7] if r50_fix else None} (#{rang.get(r50_fix[0]) if r50_fix else None})")

# 7. l'empreinte du fichier de test joué au rouge = celle du fichier livré
rouges_md = git("show", "HEAD:docs/preuves/D352/rouges/rouges.md")
m = re.search(r"venue-list\.test\.tsx` — sha256 \*\*`([0-9a-f]{64})`", rouges_md)
vrai = hashlib.sha256(open("apps/pro/src/venues/venue-list.test.tsx", "rb").read()).hexdigest()
v("7", "le fichier de test de la liste, livré, a l'empreinte sha256 qu'ont jouée les rouges", bool(m) and m.group(1) == vrai, f"rouges : {m.group(1) if m else None} ; disque : {vrai}")

# 8. l'arbre est propre ; 9. les branches gardées n'ont pas bougé ; 10. local = origin/main
status = git("status", "--short").splitlines()
v("8", "l'arbre est propre (`git status --short` : 0 ligne), aucun stash", not status and not git("stash", "list").strip(), f"lignes : {len(status)} {status[:3]} ; stash : {len(git('stash', 'list').splitlines())}")
rel = {b: git("rev-parse", "--short=7", f"origin/{b}").strip() for b in BRANCHES}
v("9", "les trois branches distantes gardées n'ont pas bougé", rel == BRANCHES, f"relevé {rel} ; attendu {BRANCHES}")
v("10", "local et `origin/main` sur le MÊME SHA (D288) — après push puis fetch", head == origin, f"HEAD = {head} ; origin/main = {origin}")

L.append("")
L.append(f"TOTAL : {len(verdicts)} contrôles — {sum(verdicts)} ✓ · {len(verdicts) - sum(verdicts)} ✗  (attendu : tous ✓)")
print("\n".join(L))
if SORTIE:
    open(SORTIE, "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")
sys.exit(0 if all(verdicts) else 1)
