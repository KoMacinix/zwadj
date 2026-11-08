#!/usr/bin/env python3
"""D344 — CONTRÔLE DE FIN DE LOT (AGENTS.md : D288, D328, D334 item 5). Lot de CODE DE TEST : la spec du lien (r30) revient dans la suite ; la spec « Nouvelle réservation » (r32) est ARRÊTÉE (R-3).

MODE D'EMPLOI : depuis la RACINE, APRÈS la poussée : `git fetch && python3 docs/preuves/D344/controle-fin-de-lot.py [--sortie <chemin>]`.
Il ne lit que git (objets, `status`, `diff`, `log`, le suivi d'`origin` après `fetch`) et les fichiers du dépôt ; il n'écrit que `--sortie`, en UTF-8, par lui-même (jamais par redirection).

POURQUOI IL EXISTE ET CE QU'IL PORTE (D290) : chaque famille imprime le NOMBRE D'ÉLÉMENTS QU'ELLE A EXAMINÉS à côté de son verdict ; un « 0 » sur zéro élément n'est pas une mesure.
Chaque verdict est un ✓ ou un ✗ ; il n'y a pas de « ? ».

INSTRUMENT D'ORIGINE : `docs/preuves/D343/controle-fin-de-lot.py` (COPIE ADAPTÉE ; les SHA, les noms et les familles propres à ce lot changent). Familles NEUVES de ce lot : les deux ARCHIVES de specs
ne sont pas touchées (R-2, D295) ; la copie de r32 n'est PAS dans `e2e/specs/` (arrêt, R-3) ; la copie de r30 est IDENTIQUE à son archive, à l'octet ; l'empreinte relevée par les rouges est celle du
fichier commité ensuite ; UNE extension de la table (la première passe de ce contrôle, déclarée avant son fichier).

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : « diff ⊆ table » rend ✗ sur un chemin fabriqué absent de la table et ✓ sur un chemin qui y est ; une ligne de PROSE qui cite un chemin
ne le déclare pas (seule une CELLULE de table entre backticks le fait) ; le test d'encodage rend ✗ sur un texte mojibaké fabriqué et ✓ sur un texte sain ; l'ancêtre rend ✓ pour un vrai ancêtre et ✗ pour
son inverse ; la copie de la table rend ✗ sur un texte altéré d'un caractère.
"""
import hashlib
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "5e932b388ce9f3303bca95e76b40cbb92c70362e"
PREMIER = "f988389"          # la table d'ouverture, SEULE
LECTURE_ADVERSE = "a4f691a"  # la consigne, la lecture adverse, l'audit « a »
ROUGES = "f1b1376"           # les pièces de rouge
CODE = "a9b5831"             # le premier (et seul) commit de code
REGLE = "f784eab"            # la règle des deux passes
PORTES = "3649729"           # la passe des six portes a été jouée sur 83a6037 ; ce commit en versait les pièces
SHA_PORTES = "83a6037"
PREMIERE_AUTORITE = "1ee9dcb"
TABLE = "docs/preuves/D344/table-ouverture.md"
AUTORITE = ["ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"]
R30 = "e2e/specs/r30-lien-calendrier-pro.e2e.ts"
ARCH30 = "docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts"
ARCH32 = "docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts"
COPIE32 = "e2e/specs/r32-nouvelle-reservation.e2e.ts"
SORTIE = []
ECHECS = []


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def rc(*args: str) -> int:
    return subprocess.run(["git", *args], capture_output=True).returncode


def noms(h: str) -> list:
    return [n for n in git("show", "--name-only", "--format=", h).splitlines() if n.strip()]


def dire(s: str = "") -> None:
    SORTIE.append(s)


def verdict(ident: str, enonce: str, ok: bool, detail: str) -> None:
    dire(f"{'✓' if ok else '✗'} [{ident}] {enonce}")
    dire(f"     ↳ {detail}")
    if not ok:
        ECHECS.append(ident)


def ancetre(a: str, b: str) -> bool:
    return rc("merge-base", "--is-ancestor", a, b) == 0


def declares(texte_table: str) -> set:
    """Les chemins DÉCLARÉS : les cellules en backticks de la PREMIÈRE colonne d'une ligne de table, et seulement elle (une phrase de prose qui cite un chemin ne le déclare pas)."""
    d = set()
    for ligne in texte_table.splitlines():
        if not ligne.startswith("|"):
            continue
        premiere = ligne.split("|")[1] if ligne.count("|") >= 2 else ""
        for morceau in re.findall(r"`([^`\n]+)`", premiere):
            d.add(morceau.strip())
    return d


FFFD = chr(0xFFFD)
MOJIBAKE = re.compile("%s[%s-%s]|%s%s[%s-%s]" % (chr(0xC3), chr(0x80), chr(0xBF), chr(0xE2), chr(0x80), chr(0x90), chr(0xBF)))


def mojibake(texte: str, base: int = 0) -> bool:
    return texte.count(FFFD) > base or bool(MOJIBAKE.search(texte))


def blob(h: str, chemin: str) -> bytes:
    return subprocess.run(["git", "show", f"{h}:{chemin}"], capture_output=True).stdout


# ───────────────────────── CALIBRATION, DEUX BRAS ─────────────────────────
table_texte = open(TABLE, encoding="utf-8", newline="").read().replace("\r\n", "\n")
DEC = declares(table_texte)
cal = []


def calibre(nom, positif, negatif):
    ok = (positif is True) and (negatif is False)
    cal.append((nom, positif, negatif))
    if not ok:
        sys.exit(f"CALIBRATION RATÉE — {nom} : cas vrai → {positif} (attendu True), cas faux → {negatif} (attendu False). ABANDON, rien n'a été jugé.")


calibre("diff ⊆ table (une cellule déclarée est reconnue, un chemin fabriqué ne l'est pas)", "docs/preuves/D344/consigne.md" in DEC, "docs/preuves/D344/fabrique-zzz.md" in DEC)
calibre("une phrase de PROSE qui cite un chemin ne le déclare pas", "ZWADJ_CONTINUITE.md" in declares("| `ZWADJ_CONTINUITE.md` | écrit |"), "ZWADJ_CONTINUITE.md" in declares("Le lot modifie `ZWADJ_CONTINUITE.md` en dernier."))
calibre("mojibake (un texte mojibaké est accusé, un texte sain ne l'est pas)", mojibake("d" + chr(0xC3) + chr(0xA9) + "j" + chr(0xC3) + chr(0xA0) + " vrai"), mojibake("d" + chr(0xE9) + "j" + chr(0xE0) + " vrai"))
calibre("ancêtre (le départ l'est de HEAD, HEAD ne l'est pas du départ)", ancetre(DEPART, "HEAD"), ancetre("HEAD", DEPART))
cont = open("ZWADJ_CONTINUITE.md", encoding="utf-8", newline="").read().replace("\r\n", "\n")
calibre("copie de la table (le texte exact est trouvé, le même texte altéré d'un caractère ne l'est pas)", table_texte.rstrip("\n") in cont, (table_texte.rstrip("\n") + "x") in cont)

# ───────────────────────── FAMILLES ─────────────────────────
dire(f"CONTRÔLE DE FIN DE LOT — D344 — départ {DEPART[:7]} — HEAD {git('rev-parse', 'HEAD').strip()[:7]}")
dire("calibration (cinq cas, deux bras chacun, ABANDON si un cas manque son verdict) : " + " ; ".join(f"{n} → vrai:{p} faux:{f}" for n, p, f in cal))
dire("")

# 1. L'ORDRE DES COMMITS
parents = git("log", "-1", "--format=%P", PREMIER).split()
fichiers_premier = noms(PREMIER)
verdict("1.1", "le PREMIER commit du lot est la table d'ouverture, SEULE", parents == [DEPART] and fichiers_premier == [TABLE],
        f"parent de {PREMIER} = {[p[:7] for p in parents]} ; fichiers = {fichiers_premier}")
tous = git("log", "--reverse", "--format=%H", f"{DEPART}..HEAD").split()
premier_autorite = next((h for h in tous if any(n in AUTORITE for n in noms(h))), None)
verdict("1.2", "la sortie de la lecture adverse précède TOUT commit qui touche un fichier d'autorité", premier_autorite is not None and premier_autorite.startswith(PREMIERE_AUTORITE) and ancetre(LECTURE_ADVERSE, premier_autorite) and not premier_autorite.startswith(LECTURE_ADVERSE),
        f"{len(tous)} commit(s) parcouru(s) ; premier commit d'autorité = {premier_autorite[:7] if premier_autorite else None} (attendu {PREMIERE_AUTORITE}) ; {LECTURE_ADVERSE} en est ancêtre : {ancetre(LECTURE_ADVERSE, premier_autorite) if premier_autorite else None}")
f_rouges, f_code = noms(ROUGES), noms(CODE)
verdict("1.3", "LES ROUGES PRÉCÈDENT LE PREMIER COMMIT DE CODE (D334, item 5) : les pièces de rouge ne contiennent aucun fichier de code, et le commit de code seulement la spec attendue",
        ancetre(ROUGES, CODE) and ROUGES != CODE and all(n.startswith("docs/preuves/D344/") for n in f_rouges) and f_code == [R30],
        f"{ROUGES} ancêtre de {CODE} : {ancetre(ROUGES, CODE)} ; {len(f_rouges)} fichier(s) de rouge, tous sous docs/preuves/D344/ : {all(n.startswith('docs/preuves/D344/') for n in f_rouges)} ; fichiers du commit de code = {f_code}")
premier_code = next((h for h in tous if any(not (n.startswith("docs/preuves/") or n in AUTORITE) for n in noms(h))), None)
verdict("1.4", "le premier commit qui touche autre chose que des pièces et des .md d'autorité est le commit de code", premier_code is not None and premier_code.startswith(CODE),
        f"premier commit de code trouvé par le parcours = {premier_code[:7] if premier_code else None} (attendu {CODE})")
index_passes = open("docs/preuves/D344/portes/deux-passes-index.txt", encoding="utf-8").read()
sha_passes = re.search(r"SHA: ([0-9a-f]+)", index_passes).group(1)[:7]
index_portes = open("docs/preuves/D344/portes/_index.txt", encoding="utf-8").read()
sha_portes = re.search(r"SHA: ([0-9a-f]+)", index_portes).group(1)[:7]
verdict("1.5", "LA RÈGLE DES DEUX PASSES est commitée AVANT les passes (jouées sur le commit même de la règle), et les six portes ont été jouées APRÈS elles",
        sha_passes == REGLE and ancetre(REGLE, sha_portes) and sha_portes == SHA_PORTES,
        f"l'index des deux passes porte SHA {sha_passes} (attendu {REGLE}) ; l'index des six portes porte SHA {sha_portes} (attendu {SHA_PORTES}), descendant de la règle : {ancetre(REGLE, sha_portes)}")
ext = [h for h in tous if noms(h) == [TABLE] and not h.startswith(PREMIER)]
verdict("1.6", "l'extension de la table (1) est SEULE dans son commit et précède le fichier qu'elle déclare", len(ext) == 1 and "**Extension 1**" in table_texte and "**Extension 2**" not in table_texte,
        f"{len(tous)} commit(s) parcouru(s) ; commits qui ne touchent que la table, hors le premier : {[h[:7] for h in ext]} (attendu 1)")

# 2. LES EMPREINTES ET LES COPIES (R-2)
emp = {}
for l in open("docs/preuves/D344/neutralisation-e2e/empreintes.txt", encoding="utf-8"):
    m = re.match(r"([0-9a-f]{64})  (\S+)", l)
    if m:
        emp[m.group(2)] = m.group(1)
octets_tr = open(R30, "rb").read()
sha_tr = hashlib.sha256(octets_tr).hexdigest()
sha_arch = hashlib.sha256(blob(DEPART, ARCH30)).hexdigest()
norm = lambda x: x.replace(bytes([13, 10]), bytes([10]))
blob_ok = norm(blob(CODE, R30)) == norm(blob(DEPART, ARCH30))
verdict("2.1", "la spec jouée par les rouges est celle du fichier commité ensuite, et la copie est IDENTIQUE à l'archive (octets de l'arbre de travail ; blobs égaux une fois les fins de ligne normalisées — `e2e/` est normalisé en LF par core.autocrlf, `docs/preuves/` est en -text)",
        emp.get(R30) == sha_tr == sha_arch and emp.get(ARCH30) == sha_arch and blob_ok,
        f"relevée {emp.get(R30, '?')[:12]}… · arbre de travail {sha_tr[:12]}… · archive au départ {sha_arch[:12]}… · blobs normalisés égaux : {blob_ok} (blob de {CODE} : {len(blob(CODE, R30))} octets, {blob(CODE, R30).count(bytes([13, 10]))} CRLF)")
touche = [n for n in git("diff", "--name-only", f"{DEPART}..HEAD", "--", ARCH30, ARCH32).splitlines() if n.strip()]
verdict("2.2", "R-2 : les deux ARCHIVES ne sont pas touchées (D295)", not touche, f"diff du départ à HEAD sur les deux chemins d'archive : {touche} (attendu aucun)")
verdict("2.3", "R-3 : la copie de r32 n'est PAS dans le dépôt, et l'arrêt est écrit", rc("cat-file", "-e", f"HEAD:{COPIE32}") != 0 and rc("cat-file", "-e", "HEAD:docs/preuves/D344/arret-spec.md") == 0,
        f"{COPIE32} dans HEAD : {rc('cat-file', '-e', 'HEAD:' + COPIE32) == 0} (attendu False) ; arret-spec.md dans HEAD : {rc('cat-file', '-e', 'HEAD:docs/preuves/D344/arret-spec.md') == 0} (attendu True)")

# 3. DIFF ⊆ TABLE, ET CE QUE LE LOT NE TOUCHE PAS
diff = [n for n in git("diff", "--name-only", f"{DEPART}..HEAD").splitlines() if n.strip()]
hors = sorted(n for n in diff if n not in DEC and n not in AUTORITE)
verdict("3.1", "git diff <départ>..HEAD --name-only ⊆ la table (chemins complets, fichiers d'autorité déclarés en section C)", not hors, f"{len(diff)} fichier(s) dans le diff ; {len(DEC)} chemin(s) déclaré(s) par cellule ; hors table : {hors}")
interdits = [n for n in diff if n.startswith("apps/") or n.startswith("packages/") or n.startswith("neutralisation/") or n == "e2e/playwright.config.ts" or n == "e2e/fixtures/harness.ts" or n.endswith("package.json") or n.endswith("pnpm-lock.yaml") or "/migrations/" in n]
verdict("3.2", "le lot ne touche NI `apps/`, NI `packages/`, NI `neutralisation/`, NI `e2e/playwright.config.ts`, NI `e2e/fixtures/harness.ts`, NI migration, NI dépendance", not interdits, f"{len(diff)} fichier(s) parcouru(s) ; fichiers interdits : {interdits}")
code_diff = sorted(n for n in diff if not n.startswith("docs/preuves/") and n not in AUTORITE)
verdict("3.3", "le code du lot est EXACTEMENT la spec de r30 (r32 et warmup.setup.ts n'y sont pas)", code_diff == [R30], f"fichiers hors pièces et hors .md d'autorité : {code_diff}")
apres_portes = [n for n in git("diff", "--name-only", f"{SHA_PORTES}..HEAD").splitlines() if n.strip() and not (n.startswith("docs/preuves/") or n in AUTORITE)]
verdict("3.4", "RIEN QU'UNE PORTE LIT n'a changé depuis les six portes (jouées sur " + SHA_PORTES + ")", not apres_portes, f"fichiers hors docs/preuves/ et hors .md d'autorité entre {SHA_PORTES} et HEAD : {apres_portes}")

# 4. LA TABLE RECOPIÉE À L'IDENTIQUE
cont = open("ZWADJ_CONTINUITE.md", encoding="utf-8", newline="").read().replace("\r\n", "\n")
copie = table_texte.rstrip("\n")
verdict("4.1", "la table d'ouverture est recopiée dans ZWADJ_CONTINUITE.md À L'IDENTIQUE", copie in cont and cont.count(copie) == 1, f"{len(copie.splitlines())} ligne(s) de la table, la copie est présente {cont.count(copie)} fois (attendu 1)")

# 5. ENCODAGE ET FINS DE LIGNE
mojis, bases = [], {}
for f in AUTORITE + [R30]:
    avant_f = subprocess.run(["git", "show", f"{DEPART}:{f}"], capture_output=True).stdout.decode("utf-8", errors="replace")
    bases[f] = avant_f.count(FFFD)
    if mojibake(open(f, "rb").read().decode("utf-8"), bases[f]):
        mojis.append(f)
verdict("5.1", "aucun mojibake NOUVEAU dans les trois fichiers d'autorité ni dans la spec (U+FFFD comparé au départ)", not mojis, f"4 fichier(s) lus ; U+FFFD au départ par fichier : {bases} ; mojibakés : {mojis}")
lf_nus = {}
for f in AUTORITE + [R30]:
    b = open(f, "rb").read()
    lf_nus[f] = b.count(b"\n") - b.count(b"\r\n")
verdict("5.2", "les fichiers CRLF le sont restés : 0 LF nu", all(v == 0 for v in lf_nus.values()), f"LF nus par fichier : {lf_nus}")

# 6. LES REGISTRES ET LE COMPTEUR
registre = re.findall(r"^\| (D\d+) \|", cont, re.M)
agents = open("AGENTS.md", encoding="utf-8", newline="").read()
verdict("6.1", "D343 et D344 sont au registre, D344 en dernier", registre[-2:] == ["D343", "D344"], f"{len(registre)} ligne(s) de registre parcourue(s), les deux dernières = {registre[-2:]}")
verdict("6.2", "le compteur POUR MÉMOIRE est à VINGT dans AGENTS.md (note de D344)", "compteur POUR MÉMOIRE **DIX-NEUF → VINGT**" in agents, f"note « DIX-NEUF → VINGT » présente : {'compteur POUR MÉMOIRE **DIX-NEUF → VINGT**' in agents}")
verdict("6.3", "l'ordre des rangs porte « RANG 46 : CLOS » puis « RANG 47 : EN ATTENTE DE CADRAGE DU RELECTEUR »", "⇒ **RANG 46 : CLOS" in cont and "⇒ **RANG 47 : EN ATTENTE DE CADRAGE DU RELECTEUR.**" in cont and cont.index("⇒ **RANG 46 : CLOS") < cont.index("⇒ **RANG 47 : EN ATTENTE DE CADRAGE DU RELECTEUR.**"),
        f"occurrences : RANG 46 : CLOS {cont.count('⇒ **RANG 46 : CLOS')} (attendu 1), RANG 47 {cont.count('⇒ **RANG 47 : EN ATTENTE DE CADRAGE DU RELECTEUR.**')} (attendu 1)")

# 7. LA SYNCHRONISATION (D288) — local et origin SUR LE MÊME SHA
tete, om = git("rev-parse", "HEAD").strip(), git("rev-parse", "origin/main").strip()
verdict("7.1", "local et origin/main sur le MÊME SHA (D288), après git fetch", tete == om, f"HEAD = {tete[:12]} ; origin/main = {om[:12]}")
of, oi = git("rev-parse", "origin/front-client").strip(), git("rev-parse", "origin/integration-45").strip()
verdict("7.2", "R-18 de D343 : origin/front-client ET origin/integration-45 existent encore (ce lot n'en supprime aucune)", len(of) == 40 and len(oi) == 40, f"origin/front-client = {of[:7]} ; origin/integration-45 = {oi[:7]}")
etat = [l for l in git("status", "--short").splitlines() if l.strip()]
stash = [l for l in git("stash", "list").splitlines() if l.strip()]
verdict("7.3", "arbre propre, aucun stash", not etat and not stash, f"`git status --short` : {len(etat)} ligne(s) ; stash : {len(stash)}")

# ───────────────────────── SORTIE ─────────────────────────
dire("")
dire(f"{len([l for l in SORTIE if l.startswith('✓') or l.startswith('✗')])} contrôles parcourus : {len([l for l in SORTIE if l.startswith('✓')])} ✓ · {len(ECHECS)} ✗ (attendu : 0 ✗)")
texte = "\n".join(SORTIE) + "\n"
print(texte, end="")
if "--sortie" in sys.argv:
    chemin = sys.argv[sys.argv.index("--sortie") + 1]
    with open(chemin, "w", encoding="utf-8", newline="\n") as f:
        f.write(texte)
sys.exit(1 if ECHECS else 0)
