#!/usr/bin/env python3
"""Contrôle de FIN DE LOT — D351 (rang 53) — règles de `AGENTS.md` : D288 (local et `origin/main` sur le MÊME SHA, vérifié et rapporté), D328 (l'ordre des commits d'un lot est fixé, et c'est `git` qui le prouve), D334 point 5 (pour un lot de code, le commit des pièces de rouge précède le premier commit de code).
Chaque contrôle rend ce qu'il a PARCOURU à côté de son verdict et l'ATTENDU à côté du mesuré (D290). Lecture seule : aucun fichier n'est écrit, sauf `--sortie` (UTF-8, LF, écrit par le script lui-même : D298).
Usage, depuis la racine, APRÈS la poussée : python3 docs/preuves/D351/controle-fin-de-lot.py [--sortie <chemin>]  (il fait `git fetch` : une lecture du distant)."""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "5951b2cbee9fad52cdec5ddcbecf52d96a4d5e35"
BRANCHE = "7fdc67961727a3280f8e2210594ba507a0fbfb97"
TABLE = "docs/preuves/D351/table-ouverture.md"
AUTORITE = ("ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md")


def git(*a, brut=False):
    r = subprocess.run(["git", *a], capture_output=True)
    return r.stdout if brut else r.stdout.decode("utf-8", errors="replace")


L, verdicts = [], []


def v(ident, enonce, ok, detail):
    verdicts.append(ok)
    L.append(f"{'✓' if ok else '✗'} [{ident}] {enonce}")
    L.append(f"     ↳ {detail}")


git("fetch", "origin")
head = git("rev-parse", "HEAD").strip()
origin = git("rev-parse", "origin/main").strip()
tete = f"HEAD = {head}"
# ⚠ LES COMMITS DU LOT = la ligne du PREMIER PARENT (`--first-parent`) : les 21 commits de la branche `par-carte`, importés par la fusion avec leurs SHA, ne sont pas des commits de ce lot
# (défaut d'instrument de la première passe, gardée : `controle-fin-de-lot-passe-1-AVANT-CORRECTIFS.txt` — « premier commit » = `8a64f57`, de la branche ; « 5 extensions » dont `42d86a9`, de la branche).
commits = [l.split(" ", 1) for l in git("log", "--first-parent", "--reverse", "--format=%H %s", f"{DEPART}..HEAD").splitlines()]
print_commits = len(commits)
importes = int(git("rev-list", "--count", f"{DEPART}..HEAD").strip()) - print_commits

# 1. le premier commit du lot : la table, SEULE
premier = commits[0][0]
fichiers_premier = [l for l in git("show", "--name-only", "--format=", premier).splitlines() if l.strip()]
v("1", "le PREMIER commit du lot ne contient que `docs/preuves/D351/table-ouverture.md`", fichiers_premier == [TABLE],
  f"{print_commits} commits depuis le départ ; premier = {premier[:7]} ; fichiers : {fichiers_premier} ; attendu : [{TABLE!r}]")

# 2. le diff final est inclus dans la table (chemins complets, extensions comprises)
table = git("show", f"HEAD:{TABLE}")
declares = set(re.findall(r"`((?:apps|packages|docs|e2e|neutralisation)/[^`\s]+|ZWADJ_[A-Z]+\.md|AGENTS\.md|pnpm-lock\.yaml)`", table))
bloc_a = re.search(r"## A\. .*?```\n(.*?)\n```", table, re.S)
declares |= set(bloc_a.group(1).split("\n")) if bloc_a else set()
bloc_ext = re.search(r"journaux de campagne.*?```\n(.*?)\n```", table, re.S)
declares |= set(bloc_ext.group(1).split("\n")) if bloc_ext else set()
diff = [l for l in git("diff", "--name-only", f"{DEPART}..HEAD").splitlines() if l.strip()]
non_declares = sorted(f for f in diff if f not in declares)
v("2", "`git diff <SHA de départ>..HEAD --name-only` ⊆ la table (chemins COMPLETS, extensions comprises)", not non_declares,
  f"{len(diff)} fichiers modifiés depuis le départ ; {len(declares)} chemins complets déclarés ; NON déclarés : {len(non_declares)} {non_declares[:6]} (attendu 0)")
non_liste_a = sorted(f for f in diff if not f.startswith("docs/preuves/") and f not in set(bloc_a.group(1).split("\n")) and f not in AUTORITE)
v("2c", "le SEUL fichier hors de la liste A, hors `docs/preuves/` et hors fichiers d'autorité est le repère de parité", non_liste_a == ["apps/api/src/common/i18n-parity.spec.ts"], f"relevé : {non_liste_a}")
v("2d", "aucun fichier de `neutralisation/` n'a été modifié par ce lot en dehors des six harnais de la branche et des 11 pièces versées", sorted(f for f in diff if f.startswith("neutralisation/")) == [f"neutralisation/neutralize-ca{i}.py" for i in range(1, 7)], f"fichiers sous neutralisation/ : {sorted(f for f in diff if f.startswith('neutralisation/'))}")
v("2e", "aucune migration, aucun fichier SQL, un seul fichier de dépendance en plus du verrou", not [f for f in diff if f.startswith("apps/api/prisma") or f.endswith(".sql")] and [f for f in diff if f.endswith("package.json")] == ["packages/ui/package.json"],
  f"migrations/sql : {[f for f in diff if f.startswith('apps/api/prisma') or f.endswith('.sql')]} ; package.json : {[f for f in diff if f.endswith('package.json')]}")

# 3. l'ordre : la lecture adverse, avant tout .md d'autorité ; les rouges / pièces avant le code ; les extensions SEULES
FICHIERS = {sha: [l for l in git("show", "--name-only", "--format=", sha).splitlines() if l.strip()] for sha, _ in commits}
TABLES = {sha: git("show", f"{sha}:{TABLE}") for sha, _ in commits}


def premier_commit(chemins):
    for sha, _ in commits:
        if any(c in FICHIERS[sha] for c in chemins):
            return sha
    return None


sha_lecture = premier_commit(["docs/preuves/D351/lecture-adverse/confronter-sortie.txt"])
sha_autorite = premier_commit(list(AUTORITE))
ordre = {sha: i for i, (sha, _) in enumerate(commits)}
v("3a", "la sortie de la lecture adverse est commitée AVANT tout `.md` d'autorité", sha_lecture is not None and sha_autorite is not None and ordre[sha_lecture] < ordre[sha_autorite],
  f"lecture adverse : {str(sha_lecture)[:7]} (rang {ordre.get(sha_lecture)}) ; premier commit d'un `.md` d'autorité : {str(sha_autorite)[:7]} (rang {ordre.get(sha_autorite)}) — la PREMIÈRE écriture d'autorité (les arbitrages) précède la fusion, comme à D342")
sha_fusion = [sha for sha, _ in commits if len(git("rev-list", "--parents", "-n", "1", sha).split()) == 3]
v("3b", "la fusion est UN commit à deux parents, et la première écriture d'autorité (les arbitrages de Ko) la PRÉCÈDE", len(sha_fusion) == 1 and ordre[sha_autorite] < ordre[sha_fusion[0]],
  f"commits de fusion : {[s[:7] for s in sha_fusion]} ; première écriture d'autorité rang {ordre[sha_autorite]} < fusion rang {ordre[sha_fusion[0]]}")
sha_code = premier_commit(["apps/api/src/common/i18n-parity.spec.ts"])
sha_rouge = premier_commit(["docs/preuves/D351/r5/releve-parite.txt"])
v("3c", "D334 point 5 : le commit de la pièce du repère (le rouge lu à 1297) PRÉCÈDE le commit du code de test", ordre[sha_rouge] < ordre[sha_code],
  f"pièce {sha_rouge[:7]} (rang {ordre[sha_rouge]}) ; code {sha_code[:7]} (rang {ordre[sha_code]}) ; ce lot n'écrit qu'UN fichier de code (le repère) en plus de la fusion")
ext = [(sha, s) for sha, s in commits if re.search(r"extension \d+ de la table", s)]
ok_ext = all([l for l in git("show", "--name-only", "--format=", sha).splitlines() if l.strip()] == [TABLE] for sha, _ in ext)
v("3d", "chaque extension de la table est un commit qui ne touche QUE la table", ok_ext and len(ext) == 5, f"{len(ext)} extensions : {[(sha[:7]) for sha, _ in ext]} (attendu 5 : quatre à l'ouverture et à la passe des portes, la cinquième après la première passe de CE contrôle ; chacune sur [{TABLE!r}])")
# chaque extension précède le commit des fichiers qu'elle déclare : pour chaque pièce versée, le premier commit dont la table la nomme
fautes, parcourues = [], 0
for sha, _ in commits:
    for f in FICHIERS[sha]:
        if f.startswith("docs/preuves/D351/") and f != TABLE:
            parcourues += 1
            premiere = next((esha for esha, _ in commits if f in TABLES[esha]), None)
            if premiere is None or ordre[premiere] > ordre[sha]:
                fautes.append((f.replace("docs/preuves/D351/", ""), sha[:7], str(premiere)[:7]))
v("3e", "chaque pièce de `docs/preuves/D351/` est déclarée dans la table AVANT (ou par) le commit qui l'ajoute", not fautes, f"{parcourues} pièces parcourues ; déclarées APRÈS leur commit (ou jamais) : {len(fautes)} {fautes[:4]} (attendu 0 ; les pièces déclarées à l'ouverture sont dans le premier commit de la table)")

# 4. la fusion : arbre identique à celui que git merge-tree recalcule
fus = sha_fusion[0]
p1, p2 = git("rev-list", "--parents", "-n", "1", fus).split()[1:3]
mt = subprocess.run(["git", "merge-tree", "--write-tree", p1, p2], capture_output=True, encoding="utf-8")
arbre_rejoue = mt.stdout.splitlines()[0] if mt.stdout.strip() else ""
v("4", "l'arbre du commit de fusion = celui que `git merge-tree` recalcule seul entre ses deux parents ; le second parent est la pointe de `par-carte`", arbre_rejoue == git("rev-parse", f"{fus}^{{tree}}").strip() and p2 == BRANCHE and mt.returncode == 0,
  f"fusion {fus[:7]} ; parents {p1[:7]} et {p2[:7]} (attendu {BRANCHE[:7]}) ; arbre {git('rev-parse', fus + '^{tree}').strip()[:12]} ; rejoué {arbre_rejoue[:12]} (code {mt.returncode})")
v("4b", "la branche `par-carte` est GARDÉE : `origin/par-carte` n'a pas bougé", git("rev-parse", "origin/par-carte").strip() == BRANCHE, f"origin/par-carte = {git('rev-parse', 'origin/par-carte').strip()[:12]} (attendu {BRANCHE[:12]})")

# 5. les trois fichiers d'autorité : octets
for f in AUTORITE:
    b = git("show", f"HEAD:{f}", brut=True)
    # l'objet git est en LF (normalisation) : le contrôle CRLF se fait sur le fichier de travail
    w = open(f, "rb").read()
    v("5", f"{f} : fin de ligne du fichier de travail en octets, gabarits et marqueurs", w.count(b"\n") == w.count(b"\r\n") and b"@@COMPTEUR@@" not in w and b"@@COMMITS_SUITE@@" not in w,
      f"{len(w)} octets · CRLF {w.count(b'\r\n')} · LF nu {w.count(b'\n') - w.count(b'\r\n')} (attendu 0) · « @@COMPTEUR@@ » : {w.count(b'@@COMPTEUR@@')} · « @@COMMITS_SUITE@@ » : {w.count(b'@@COMMITS_SUITE@@')} (attendu 0)")
cont = open("ZWADJ_CONTINUITE.md", encoding="utf-8", newline="").read()
regs = re.findall(r"^\| (D\d+) \| ", cont, re.M)
v("5b", "le registre se termine par D351, et D351 n'y est qu'UNE fois", regs[-1] == "D351" and regs.count("D351") == 1, f"{len(regs)} lignes de décision lues ; dernière = {regs[-1]} ; occurrences de D351 en tête de ligne : {regs.count('D351')}")
def existe(chemin):
    return subprocess.run(["git", "cat-file", "-e", f"HEAD:{chemin}"], capture_output=True).returncode == 0


pieces_d277 = ("docs/preuves/D351/passe-d277/sortie-avant.txt", "docs/preuves/D351/passe-d277/sortie-apres.txt", "docs/preuves/D351/passe-d277.md")
v("5c", "la passe D277 : « avant » et « après » existent, et le compte rendu aussi", all(existe(p_) for p_ in pieces_d277), f"présentes dans HEAD : {[existe(p_) for p_ in pieces_d277]} (attendu [True, True, True])")

# 6. LOCAL ET ORIGIN SUR LE MÊME SHA (D288) : le geste mécanique
v("6", "local et `origin/main` sur le MÊME SHA (D288) — ⚠ les deux SHA vont dans le rapport", head == origin,
  f"HEAD = {head} ; origin/main = {origin} ; identiques : {head == origin} ; `git status --short` : [{git('status', '--short').strip()}] (attendu : au plus les pièces de CE contrôle, non encore commitées)")

ok = all(verdicts)
entete = [f"D351 — contrôle de fin de lot (D288, D328, D334) : chaque contrôle rend ce qu'il a PARCOURU à côté de son verdict, et l'ATTENDU à côté du mesuré",
          "NOTE : la PREMIÈRE passe de ce contrôle (versée : controle-fin-de-lot-passe-1-AVANT-CORRECTIFS.txt) rendait 2 ✗ — des défauts de l'INSTRUMENT, pas du lot : il lisait les 21 commits importés de la branche comme des commits du lot (premier commit, extensions). Corrigé par --first-parent ; le comportement ne démentait pas le lot.",
          f"{tete} · SHA de départ {DEPART} · {print_commits} commits du lot sur la ligne du premier parent (+ {importes} commits de la branche importés par la fusion) · {len(verdicts)} contrôles : {sum(verdicts)} ✓ · {len(verdicts) - sum(verdicts)} ✗ (attendu : 0 ✗)", ""]
texte = "\n".join(entete + L) + "\n"
print(texte, end="")
if "--sortie" in sys.argv:
    with open(sys.argv[sys.argv.index("--sortie") + 1], "w", encoding="utf-8", newline="\n") as f:
        f.write(texte)
sys.exit(0 if ok else 1)
