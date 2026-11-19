#!/usr/bin/env python3
"""Contrôle de FIN DE LOT — D353 (rang 55) — règles de `AGENTS.md` : D288 (local et `origin/main` sur le MÊME SHA, vérifié et rapporté), D328 (l'ordre des commits d'un lot est fixé, et c'est `git` qui le prouve), D334 point 5 (les pièces des rouges précèdent le premier commit de code).
Chaque contrôle rend ce qu'il a PARCOURU à côté de son verdict et l'ATTENDU à côté du mesuré (D290). Lecture seule : aucun fichier n'est écrit, sauf `--sortie` (UTF-8, LF, écrit par le script lui-même, jamais par redirection du shell — D298).
Usage, depuis la racine, APRÈS la poussée : python3 docs/preuves/D353/controle-fin-de-lot.py [--sortie <chemin>]  (il fait `git fetch` : une lecture du distant).

INSTRUMENT ÉCARTÉ : réutiliser `docs/preuves/D352/controle-fin-de-lot.py` tel quel — collé aux fichiers du rang 54 (la liste, les 29 gardes, `r50`). Sa STRUCTURE est reprise : `--first-parent` pour les commits du lot, la table d'ouverture lue à `HEAD`, les extensions comptées, la calibration à deux bras.
CALIBRATION (D286) : le contrôle d'ordre est essayé sur un cas où la réponse est connue — la table d'ouverture (premier commit) précède la consigne : doit rendre « vrai » ; la consigne précède la table : « faux » ; le contrôle de déclaration : un chemin du lot est déclaré, un chemin hors lot ne l'est pas.
"""
import hashlib
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "cd8e07921a4c18c2559506c463ede06eed3178a1"
TABLE = "docs/preuves/D353/table-ouverture.md"
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


def premier_commit_qui_touche(chemin):
    r = git("log", "--first-parent", "--reverse", "--format=%H", f"{DEPART}..HEAD", "--", chemin).split()
    return r[0] if r else None


def premier_commit_ou_le_texte_entre_dans_la_table(texte):
    r = git("log", "--first-parent", "--reverse", "--format=%H", "-S" + texte, f"{DEPART}..HEAD", "--", TABLE).split()
    return r[0] if r else None


# CALIBRATION du contrôle d'ordre
c1, c2 = premier_ajout("docs/preuves/D353/consigne.md"), premier_ajout(TABLE)
cal_ok = c1 is not None and c2 is not None and rang[c2] < rang[c1] and not (rang[c1] < rang[c2])
L.append(f"calibration : la table ({c2[:7] if c2 else None}) précède la consigne ({c1[:7] if c1 else None}) : {rang[c2] < rang[c1] if c1 and c2 else None} (attendu vrai) ; la consigne précède la table : {rang[c1] < rang[c2] if c1 and c2 else None} (attendu faux)")
if not cal_ok:
    L.append("✗ ABANDON : la calibration du contrôle d'ordre a manqué son verdict")
    print("\n".join(L))
    sys.exit(2)

# 1. le premier commit du lot : la table, SEULE
premier = commits[0][0]
fp = [l for l in git("show", "--name-only", "--format=", premier).splitlines() if l.strip()]
v("1", "le PREMIER commit du lot ne contient que `docs/preuves/D353/table-ouverture.md`", fp == [TABLE], f"{len(commits)} commits du lot (--first-parent) ; {importes} commit(s) importé(s) ; premier = {premier[:7]} ; fichiers : {fp}")

# 2. le diff final est inclus dans la table (chemins COMPLETS, extensions comprises)
table = git("show", f"HEAD:{TABLE}")
declares = set()
for bloc in re.findall(r"```\n(.*?)\n```", table, re.S):
    declares |= {l.strip() for l in bloc.split("\n") if l.strip() and "/" in l or l.strip() in AUTORITE}
declares |= {m for m in re.findall(r"`((?:apps|packages|docs|e2e|neutralisation)/[^`\s*]+)`", table) if not m.endswith("/")}
# CALIBRATION du contrôle de déclaration (D286) : un chemin du lot, connu, est déclaré (vrai) ; un chemin hors lot, connu, ne l'est pas (faux) — sans quoi « 0 non déclaré » serait vrai de n'importe quelle liste.
cal_decl = ("apps/client/src/lib/api.test.ts" in declares, "apps/api/src/main.ts" in declares)
L.append(f"calibration : `api.test.ts` déclaré : {cal_decl[0]} (attendu vrai) ; `apps/api/src/main.ts` déclaré : {cal_decl[1]} (attendu faux) ; chemins déclarés lus : {len(declares)}")
if cal_decl != (True, False):
    L.append("✗ ABANDON : la calibration du contrôle de déclaration a manqué son verdict")
    print("\n".join(L))
    sys.exit(2)
diff = [l for l in git("diff", "--name-only", f"{DEPART}..HEAD").splitlines() if l.strip()]
non_declares = sorted(f for f in diff if f not in declares)
v("2", "`git diff <SHA de départ>..HEAD --name-only` ⊆ la table (chemins COMPLETS, extensions comprises)", not non_declares, f"{len(diff)} fichiers modifiés depuis le départ ; {len(declares)} chemins déclarés ; NON déclarés : {len(non_declares)} {non_declares[:8]} (attendu 0)")

# 3. la lecture adverse précède TOUT .md d'autorité
la = premier_ajout("docs/preuves/D353/lecture-adverse/confronter-sortie.txt")
premier_auth = next((sha for sha, _ in commits if any(f in git("show", "--name-only", "--format=", sha).splitlines() for f in AUTORITE)), None)
v("3", "la sortie de la lecture adverse entre dans un commit ANTÉRIEUR au premier commit qui touche un `.md` d'autorité", la is not None and premier_auth is not None and rang[la] < rang[premier_auth],
  f"lecture adverse : {la[:7] if la else None} (#{rang.get(la)}) ; premier commit d'autorité : {premier_auth[:7] if premier_auth else None} (#{rang.get(premier_auth)})")

# 4. l'adoption de la consigne par Ko en PREMIÈRE écriture d'autorité
diff_auth = git("show", premier_auth, "--", "ZWADJ_CONTINUITE.md") if premier_auth else ""
v("4", "la première écriture d'autorité porte l'arbitrage de Ko (bloc « ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 55 ») et la table recopiée", "ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 55" in diff_auth and "TABLE D'OUVERTURE DU RANG 55 (D353)" in diff_auth,
  f"commit {premier_auth[:7] if premier_auth else None} ; bloc d'arbitrage dans le diff : {'ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 55' in diff_auth} ; table recopiée : {'TABLE D' + chr(39) + 'OUVERTURE DU RANG 55 (D353)' in diff_auth}")

# 5. chaque extension de la table précède le commit du fichier qu'elle couvre
exts = [(m.start(), m.group(0)) for m in re.finditer(r"### Extension \d+ —", table)]
echecs, examines = [], 0
for chemin in diff:
    if chemin == TABLE:
        continue
    ajout = premier_commit_qui_touche(chemin)
    if ajout is None:
        continue
    examines += 1
    entree = premier_commit_ou_le_texte_entre_dans_la_table(chemin)
    if entree is None:
        # un chemin déclaré à l'OUVERTURE (section B ou tableau conditionnel) : il figure dans le premier commit de la table
        entree = premier
    if rang[entree] > rang[ajout]:
        echecs.append((chemin, entree[:7], ajout[:7]))
v("5", "chaque fichier du lot est déclaré dans la table AVANT (ou dans) le commit qui le touche pour la première fois — l'extension précède le fichier qu'elle couvre", not echecs,
  f"{examines} fichiers touchés examinés, {len(exts)} extensions ; en retard : {len(echecs)} {echecs[:4]} (attendu 0)")

# 6. D334 point 5 : les pièces des rouges précèdent le premier commit de code
rouge_e2e = premier_ajout("docs/preuves/D353/rouges/r1-r48-seule-etat-F-ROUGE-sortie-masquee.txt")
rouge_md = premier_ajout("docs/preuves/D353/rouges/rouges.md")
rouge_r3 = premier_ajout("docs/preuves/D353/rouges/r3-tests-referentiels-contre-code-d-avant.txt")
rouge_prod = premier_ajout("docs/preuves/D353/mesures/r2-production.md")
codes = {c: premier_commit_qui_touche(c) for c in ("apps/client/src/lib/api.ts", "apps/client/src/lib/api.test.ts", "apps/api/test/int/venue-map.int-spec.ts", "e2e/specs/r48-assistant-choix.e2e.ts", "neutralisation/neutralize-r55.py")}
premier_code = min((c for c in codes.values() if c), key=lambda s: rang[s]) if any(codes.values()) else None
ok6 = premier_code is not None and all(x is not None and rang[x] < rang[premier_code] for x in (rouge_e2e, rouge_md, rouge_r3, rouge_prod))
v("6", "les pièces des rouges (R-1, R-2, R-3, R-4, R-5) entrent dans un commit ANTÉRIEUR au premier commit de code (D334, point 5)", ok6,
  f"rouge e2e r48 seule : {rouge_e2e[:7] if rouge_e2e else None} (#{rang.get(rouge_e2e)}) ; lecture des rouges : {rouge_md[:7] if rouge_md else None} (#{rang.get(rouge_md)}) ; rouge unitaire R-3 : {rouge_r3[:7] if rouge_r3 else None} (#{rang.get(rouge_r3)}) ; mesure de production R-2 : {rouge_prod[:7] if rouge_prod else None} (#{rang.get(rouge_prod)}) ; premier commit de code : {premier_code[:7] if premier_code else None} (#{rang.get(premier_code)}) — fichiers de code : { {c: (s[:7] if s else None) for c, s in codes.items()} }")

# 7. l'empreinte des fichiers de test joués aux rouges = celle des fichiers livrés
def sha(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


rouges_md = git("show", "HEAD:docs/preuves/D353/rouges/rouges.md")
r3_piece = git("show", "HEAD:docs/preuves/D353/rouges/r3-tests-referentiels-contre-code-d-avant.txt")
m_r48 = re.search(r"r48-assistant-choix\.e2e\.ts` \(durcie[^|]*\| `([0-9a-f]{64})`", rouges_md)
m_int = re.search(r"venue-map\.int-spec\.ts` \(le cas[^|]*\| `([0-9a-f]{64})`", rouges_md)
m_r4 = re.search(r"api\.test\.ts` \(le test du `no-store`[^|]*\| `([0-9a-f]{64})`", rouges_md)
m_r3 = re.search(r"fichier de test joué : apps/client/src/lib/api\.test\.ts · sha256 ([0-9a-f]{64})", r3_piece)
d_r48, d_int, d_api = sha("e2e/specs/r48-assistant-choix.e2e.ts"), sha("apps/api/test/int/venue-map.int-spec.ts"), sha("apps/client/src/lib/api.test.ts")
v("7a", "`r48` livrée a l'empreinte jouée au rouge e2e", bool(m_r48) and m_r48.group(1) == d_r48, f"rouges : {m_r48.group(1) if m_r48 else None} ; disque : {d_r48}")
v("7b", "`venue-map.int-spec.ts` livré a l'empreinte jouée au rouge de R-5", bool(m_int) and m_int.group(1) == d_int, f"rouges : {m_int.group(1) if m_int else None} ; disque : {d_int}")
v("7c", "`api.test.ts` livré a l'empreinte jouée au rouge unitaire de R-3", bool(m_r3) and m_r3.group(1) == d_api, f"rouge R-3 : {m_r3.group(1) if m_r3 else None} ; disque : {d_api}")
L.append(f"     (information) le rouge de R-4 a joué un état ANTÉRIEUR de `api.test.ts` ({m_r4.group(1)[:12] if m_r4 else None}…, avant l'ajout des tests de R-3) : le fichier a GRANDI, le test de R-4 est inchangé ; la cible R55-1 de `neutralize-r55.py` rejoue la mutation sur le fichier livré")
harnais = sha("neutralisation/neutralize-r55.py")
L.append(f"     (information) empreinte du harnais livré `neutralize-r55.py` : {harnais} ; à rapprocher de la première ligne de chaque journal de campagne")

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
