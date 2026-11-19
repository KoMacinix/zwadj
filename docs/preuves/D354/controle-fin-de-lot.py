#!/usr/bin/env python3
"""Contrôle de FIN DE LOT — D354 (rang 56) — règles de `AGENTS.md` : D288 (local et `origin/main` sur le MÊME SHA, vérifié et rapporté), D328 (l'ordre des commits d'un lot est fixé, et c'est `git` qui le prouve), D334 point 5 (les rouges avant le code).
Chaque contrôle rend ce qu'il a PARCOURU à côté de son verdict et l'ATTENDU à côté du mesuré (D290). Lecture seule : aucun fichier n'est écrit, sauf `--sortie` (UTF-8, LF, écrit par le script lui-même, jamais par redirection).
Usage, depuis la racine, APRÈS la poussée : python3 docs/preuves/D354/controle-fin-de-lot.py [--sortie <chemin>]  (il fait `git fetch` : une lecture du distant).

INSTRUMENT ÉCARTÉ : réutiliser `docs/preuves/D353/controle-fin-de-lot.py` tel quel — collé aux fichiers du rang 55 (les gardes du client, `r48`, les rouges e2e). Sa STRUCTURE est reprise : `--first-parent` pour les commits du lot, une calibration à deux bras avant chaque
verdict d'ordre, le contrôle de déclaration en chemins COMPLETS, et l'attendu écrit à côté du mesuré. CE QUI CHANGE : le contrôle 7 ne compare pas l'empreinte des tests aux rouges à égalité — trois fichiers de test ont été CORRIGÉS après le premier commit de code (T-3, S-2, A-27)
et la chaîne AVANT → APRÈS de `corrections-tests-apres-rouges.txt` doit ramener chaque fichier de son empreinte du rouge à celle du disque ; le contrôle 8 est neuf (« aucun fichier de `apps/pro` ni de `apps/client` » : R-7, aucun écran).
CALIBRATION (D286) : le contrôle d'ordre est essayé sur un cas dont la réponse est connue (la table d'ouverture précède la consigne : vrai ; la consigne précède la table : faux) ; le contrôle de déclaration sur un chemin du lot (déclaré) et un chemin hors lot (non déclaré) ;
le contrôle de chaîne sur un fichier dont la chaîne est connue (rompue : faux)."""
import hashlib
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "04239635cb09b20a06a0bf758531216c6b34b107"
TABLE = "docs/preuves/D354/table-ouverture.md"
AUTORITE = ("ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md")
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
    r = git("log", "--first-parent", "--diff-filter=A", "--reverse", "--format=%H", f"{DEPART}..HEAD", "--", chemin).split()
    return r[0] if r else None


def premier_commit_qui_touche(chemin):
    r = git("log", "--first-parent", "--reverse", "--format=%H", f"{DEPART}..HEAD", "--", chemin).split()
    return r[0] if r else None


def premier_commit_ou_le_texte_entre_dans_la_table(texte):
    r = git("log", "--first-parent", "--reverse", "--format=%H", "-S" + texte, f"{DEPART}..HEAD", "--", TABLE).split()
    return r[0] if r else None


# CALIBRATION du contrôle d'ordre
c1, c2 = premier_ajout("docs/preuves/D354/consigne.md"), premier_ajout(TABLE)
cal_ok = c1 is not None and c2 is not None and rang[c2] < rang[c1] and not (rang[c1] < rang[c2])
L.append(f"calibration : la table ({c2[:7] if c2 else None}) précède la consigne ({c1[:7] if c1 else None}) : {rang[c2] < rang[c1] if c1 and c2 else None} (attendu vrai) ; la consigne précède la table : {rang[c1] < rang[c2] if c1 and c2 else None} (attendu faux)")
if not cal_ok:
    L.append("✗ ABANDON : la calibration du contrôle d'ordre a manqué son verdict")
    print("\n".join(L))
    sys.exit(2)

# 1. le premier commit du lot : la table, SEULE
premier = commits[0][0]
fp = [l for l in git("show", "--name-only", "--format=", premier).splitlines() if l.strip()]
v("1", "le PREMIER commit du lot ne contient que `docs/preuves/D354/table-ouverture.md`", fp == [TABLE], f"{len(commits)} commits du lot (--first-parent) ; {importes} commit(s) importé(s) ; premier = {premier[:7]} ; fichiers du premier commit : {fp}")

# 2. le diff final est inclus dans la table (chemins COMPLETS, extensions comprises)
table = git("show", f"HEAD:{TABLE}")
declares = set()
for bloc in re.findall(r"```\n(.*?)\n```", table, re.S):
    declares |= {l.strip() for l in bloc.split("\n") if l.strip() and "/" in l or l.strip() in AUTORITE}
declares |= {m for m in re.findall(r"`((?:apps|packages|docs|e2e|neutralisation)/[^`\s*]+)`", table) if not m.endswith("/")}
declares |= set(AUTORITE)
cal_decl = ("apps/api/src/staff/staff-members.service.ts" in declares, "apps/api/src/main.ts" in declares)
L.append(f"calibration : `staff-members.service.ts` déclaré : {cal_decl[0]} (attendu vrai) ; `apps/api/src/main.ts` déclaré : {cal_decl[1]} (attendu faux) ; chemins déclarés lus : {len(declares)}")
if cal_decl != (True, False):
    L.append("✗ ABANDON : la calibration du contrôle de déclaration a manqué son verdict")
    print("\n".join(L))
    sys.exit(2)
diff = [l for l in git("diff", "--name-only", f"{DEPART}..HEAD").splitlines() if l.strip()]
non_declares = sorted(f for f in diff if f not in declares)
v("2", "`git diff <SHA de départ>..HEAD --name-only` ⊆ la table (chemins COMPLETS, extensions comprises)", not non_declares, f"{len(diff)} fichiers modifiés depuis le départ ; {len(declares)} chemins déclarés ; NON déclarés : {len(non_declares)} {non_declares[:5]} (attendu 0)")

# 3. la lecture adverse précède TOUT .md d'autorité
la = premier_ajout("docs/preuves/D354/lecture-adverse/confronter-sortie.txt")
premier_auth = next((sha for sha, _ in commits if any(f in git("show", "--name-only", "--format=", sha).splitlines() for f in AUTORITE)), None)
v("3", "la sortie de la lecture adverse entre dans un commit ANTÉRIEUR au premier commit qui touche un `.md` d'autorité", la is not None and premier_auth is not None and rang[la] < rang[premier_auth],
  f"lecture adverse : {la[:7] if la else None} (#{rang.get(la)}) ; premier commit d'autorité : {premier_auth[:7] if premier_auth else None} (#{rang.get(premier_auth)})")

# 4. l'adoption de la consigne par Ko en PREMIÈRE écriture d'autorité
diff_auth = git("show", premier_auth, "--", "ZWADJ_CONTINUITE.md") if premier_auth else ""
v("4", "la première écriture d'autorité porte l'arbitrage de Ko (bloc « ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 56 »)", "ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 56" in diff_auth,
  f"commit {premier_auth[:7] if premier_auth else None} ; bloc d'arbitrage dans le diff : {'ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 56' in diff_auth}")

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
        entree = premier
    if rang[entree] > rang[ajout]:
        echecs.append((chemin, entree[:7], ajout[:7]))
v("5", "chaque fichier du lot est déclaré dans la table AVANT (ou dans) le commit qui le touche pour la première fois — l'extension précède le fichier qu'elle couvre", not echecs,
  f"{examines} fichiers touchés examinés, {len(exts)} extensions ; en retard : {len(echecs)} {echecs[:4]} (attendu 0)")

# 6. D334 point 5 : les pièces des rouges précèdent le premier commit de code
rouges = {n: premier_ajout(f"docs/preuves/D354/rouges/{n}") for n in ("rouge-unit.txt", "rouge-client.txt", "rouge-int.txt", "lecture-des-rouges.md")}
codes = {c: premier_commit_qui_touche(c) for c in ("apps/api/src/staff/staff-members.service.ts", "apps/api/src/staff/staff-members.controller.ts", "packages/types/src/staff-capabilities.ts", "apps/api/src/staff/staff-account-state.ts", "packages/api-client/src/staff-client.ts")}
premier_code = min((c for c in codes.values() if c), key=lambda s: rang[s]) if any(codes.values()) else None
ok6 = premier_code is not None and all(x is not None and rang[x] < rang[premier_code] for x in rouges.values())
v("6", "les pièces des rouges (unitaire, client d'API, intégration, leur lecture) entrent dans un commit ANTÉRIEUR au premier commit de code (D334, point 5)", ok6,
  f"rouges : {{{', '.join(f'{n}: {c[:7] if c else None} (#{rang.get(c)})' for n, c in rouges.items())}}} ; premier commit de code : {premier_code[:7] if premier_code else None} (#{rang.get(premier_code)})")


# 7. la chaîne d'empreintes des fichiers de test : du rouge à la livraison
def sha(octets):
    return hashlib.sha256(octets).hexdigest()


def blob_head(chemin):
    return subprocess.run(["git", "show", f"HEAD:{chemin}"], capture_output=True).stdout


corr = git("show", "HEAD:docs/preuves/D354/corrections-tests-apres-rouges.txt")
transitions = {}
for m in re.finditer(r"^([0-9a-f]{64})  (AVANT|APRÈS)  (\S+)$", corr, re.M):
    transitions.setdefault(m.group(3), []).append((m.group(2), m.group(1)))
aretes = {}
for chemin, lst in transitions.items():
    for i in range(len(lst) - 1):
        if lst[i][0] == "AVANT" and lst[i + 1][0] == "APRÈS":
            aretes.setdefault(chemin, {})[lst[i][1]] = lst[i + 1][1]
rouges_sha = {}
for n in ("rouge-unit.txt", "rouge-client.txt", "rouge-int.txt"):
    for m in re.finditer(r"^#   ([0-9a-f]{64})  (\S+)$", git("show", f"HEAD:docs/preuves/D354/rouges/{n}"), re.M):
    # un fichier joué par plusieurs familles garde la même empreinte
        rouges_sha[m.group(2)] = m.group(1)


def suit(chemin, depart, arrivee):
    """La chaîne AVANT → APRÈS part de `depart` et atteint `arrivee` (ou depart == arrivee)."""
    courant, vus = depart, set()
    while courant != arrivee:
        if courant in vus or courant not in aretes.get(chemin, {}):
            return False
        vus.add(courant)
        courant = aretes[chemin][courant]
    return True


# CALIBRATION : une chaîne qu'on sait rompue (le sha du rouge d'un fichier, comparé à un sha inventé) doit rendre faux
un = next(iter(rouges_sha))
cal_chaine = (suit(un, rouges_sha[un], rouges_sha[un]), suit(un, rouges_sha[un], "0" * 64))
L.append(f"calibration : chaîne triviale (départ = arrivée) : {cal_chaine[0]} (attendu vrai) ; chaîne vers une empreinte inventée : {cal_chaine[1]} (attendu faux)")
if cal_chaine != (True, False):
    L.append("✗ ABANDON : la calibration du contrôle de chaîne a manqué son verdict")
    print("\n".join(L))
    sys.exit(2)
rompues, egales, chainees = [], 0, 0
for chemin, rouge in sorted(rouges_sha.items()):
    livre = sha(blob_head(chemin))
    if livre == rouge:
        egales += 1
    elif suit(chemin, rouge, livre):
        chainees += 1
    else:
        rompues.append(chemin)
v("7", "chaque fichier de test joué aux rouges est, à la livraison, identique OU rattaché au rouge par la chaîne AVANT → APRÈS déclarée", not rompues,
  f"{len(rouges_sha)} fichiers joués aux rouges : {egales} identiques, {chainees} corrigés et chaînés, chaîne rompue : {len(rompues)} {rompues[:3]} (attendu 0)")

# 8. R-7 : aucun écran — rien dans apps/pro ni apps/client
ecrans = [f for f in diff if f.startswith(("apps/pro/", "apps/client/"))]
v("8", "aucun fichier de `apps/pro` ni de `apps/client` au diff (R-7 : aucun écran)", not ecrans, f"{len(diff)} fichiers au diff ; sous `apps/pro/` ou `apps/client/` : {len(ecrans)} {ecrans[:3]} (attendu 0)")

# 9. aucune migration (R-1)
migrations = [f for f in diff if f.startswith("apps/api/prisma/")]
v("9", "aucun fichier de `apps/api/prisma/` au diff (R-1 : aucune migration)", not migrations, f"sous `apps/api/prisma/` : {len(migrations)} {migrations[:3]} (attendu 0)")

# 10. l'arbre est propre ; 11. local = origin/main
status = git("status", "--short").splitlines()
v("10", "l'arbre est propre (`git status --short` : 0 ligne), aucun stash", not status and not git("stash", "list").strip(), f"lignes : {len(status)} {status[:3]} ; stash : {len(git('stash', 'list').splitlines())}")
v("11", "local et `origin/main` sur le MÊME SHA (D288) — après push puis fetch", head == origin, f"HEAD = {head} ; origin/main = {origin}")

L.append("")
L.append(f"TOTAL : {len(verdicts)} contrôles — {sum(verdicts)} ✓ · {len(verdicts) - sum(verdicts)} ✗  (attendu : tous ✓)")
print("\n".join(L))
if SORTIE:
    open(SORTIE, "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")
sys.exit(0 if all(verdicts) else 1)
