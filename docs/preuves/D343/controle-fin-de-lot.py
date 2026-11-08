#!/usr/bin/env python3
"""D343 — CONTRÔLE DE FIN DE LOT (AGENTS.md : D288, D328, D334 item 5). Lot de CODE DE TEST (D265 nommé et réparé dans le harnais e2e) + clôture de l'intégration de `front-client` (D342).

MODE D'EMPLOI : depuis la RACINE, APRÈS la poussée : `git fetch && python3 docs/preuves/D343/controle-fin-de-lot.py [--sortie <chemin>]`.
Il ne lit que git (objets, `status`, `diff`, `log`, `ls-remote` via le suivi après `fetch`) et les fichiers du dépôt ; il n'écrit que `--sortie`, en UTF-8, par lui-même (jamais par redirection).

POURQUOI IL EXISTE ET CE QU'IL PORTE (D290) : chaque famille imprime le NOMBRE D'ÉLÉMENTS QU'ELLE A EXAMINÉS à côté de son verdict ; un « 0 » sur zéro élément n'est pas une mesure.
Chaque verdict est un ✓ ou un ✗ ; il n'y a pas de « ? ».

INSTRUMENT D'ORIGINE : `docs/preuves/D341/controle-fin-de-lot.py` (COPIE ADAPTÉE ; les SHA, les noms et les familles propres à ce lot changent). Familles NEUVES de ce lot : la sauvegarde `integration-45`
et la branche `front-client` existent encore (R-18) ; la fusion de D342 est ancêtre de `main` et ses 107 commits y sont ; les six portes ont été jouées sur `3ada4f7` et rien qu'une porte lit n'a changé
depuis ; les empreintes de la garde et de la reproduction jouées contre l'état d'avant sont celles des fichiers commités ensuite ; `e2e/playwright.config.ts` et `apps/api` ne sont pas touchés (R-14).

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : « diff ⊆ table » rend ✗ sur un chemin fabriqué absent de la table et ✓ sur un chemin qui y est ; une ligne de PROSE qui cite un chemin
ne le déclare pas (seule une CELLULE de table entre backticks le fait) ; le test d'encodage rend ✗ sur un texte mojibaké fabriqué et ✓ sur un texte sain ; la comparaison de la copie de la table rend ✗ sur une ligne
fabriquée absente et ✓ sur une ligne qui y est ; l'ancêtre rend ✓ pour un vrai ancêtre et ✗ pour son inverse.
"""
import hashlib
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "a1dc6355b930837beaee779c3b16dc91af51be6e"
PREMIER = "7bbf122"          # la table d'ouverture, SEULE
ROUGES = "a61e9c9"            # les pièces de rouge
CODE = "69c2257"              # le premier (et seul) commit de code
REGLE = "69671a4"             # la règle des deux passes
AUTORITE1 = "3ada4f7"         # la première écriture d'autorité, SUR LAQUELLE les deux passes et les six portes ont été jouées
LECTURE_ADVERSE = "220a56b"
FUSION = "2b79355"
MAIN_AVANT = "d44867a"
BRANCHE = "43996e279f49bff19792b4e27cfec4bb59b66177"
TABLE = "docs/preuves/D343/table-ouverture.md"
AUTORITE = ["ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"]
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
    """Les chemins DÉCLARÉS : la première cellule en backticks d'une ligne de table, et seulement elle (une phrase de prose qui cite un chemin ne le déclare pas)."""
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
    """Un caractère de remplacement EN PLUS de ceux qu'il y avait au départ (AGENTS.md en CITE un légitimement : D268 décrit le « ? » d'une sortie redirigée), ou une séquence de mojibake classique."""
    return texte.count(FFFD) > base or bool(MOJIBAKE.search(texte))


# ───────────────────────── CALIBRATION, DEUX BRAS ─────────────────────────
table_texte = open(TABLE, encoding="utf-8", newline="").read()
DEC = declares(table_texte)
cal = []


def calibre(nom, positif, negatif):
    ok = (positif is True) and (negatif is False)
    cal.append((nom, positif, negatif))
    if not ok:
        sys.exit(f"CALIBRATION RATÉE — {nom} : cas vrai → {positif} (attendu True), cas faux → {negatif} (attendu False). ABANDON, rien n'a été jugé.")


calibre("diff ⊆ table (une cellule déclarée est reconnue, un chemin fabriqué ne l'est pas)", "docs/preuves/D343/consigne.md" in DEC, "docs/preuves/D343/fabrique-zzz.md" in DEC)
calibre("une phrase de PROSE qui cite un chemin ne le déclare pas", "ZWADJ_CONTINUITE.md" in declares("| `ZWADJ_CONTINUITE.md` | écrit |"), "ZWADJ_CONTINUITE.md" in declares("Le lot modifie `ZWADJ_CONTINUITE.md` en dernier."))
calibre("mojibake (un texte mojibaké est accusé, un texte sain ne l'est pas)", mojibake("d" + chr(0xC3) + chr(0xA9) + "j" + chr(0xC3) + chr(0xA0) + " vrai"), mojibake("d" + chr(0xE9) + "j" + chr(0xE0) + " vrai"))
calibre("mojibake différentiel (un U+FFFD de plus que le départ est accusé, celui déjà cité au départ ne l'est pas)", mojibake("a " + FFFD + " b " + FFFD, base=1), mojibake("a " + FFFD + " b", base=1))
calibre("ancêtre (le départ l'est de HEAD, HEAD ne l'est pas du départ)", ancetre(DEPART, "HEAD"), ancetre("HEAD", DEPART))
ligne_copie = "**Extension 1** (07/11/2026, commitée SEULE"
calibre("copie de la table (une ligne qui y est est trouvée, une ligne fabriquée absente ne l'est pas)", ligne_copie in table_texte, "**Extension 99** (fabriquée" in table_texte)

# ───────────────────────── FAMILLES ─────────────────────────
dire(f"CONTRÔLE DE FIN DE LOT — D343 — départ {DEPART[:7]} — HEAD {git('rev-parse', 'HEAD').strip()[:7]}")
dire("calibration (cinq cas, deux bras chacun, ABANDON si un cas manque son verdict) : " + " ; ".join(f"{n} → vrai:{p} faux:{f}" for n, p, f in cal))
dire("")

# 1. L'ORDRE DES COMMITS
parents = git("log", "-1", "--format=%P", PREMIER).split()
fichiers_premier = noms(PREMIER)
verdict("1.1", "le PREMIER commit du lot est la table d'ouverture, SEULE", parents == [DEPART] and fichiers_premier == [TABLE],
        f"parent de {PREMIER} = {[p[:7] for p in parents]} ; fichiers = {fichiers_premier}")
premier_autorite = None
for h in git("log", "--reverse", "--format=%H", f"{DEPART}..HEAD").split():
    if any(n in AUTORITE for n in noms(h)):
        premier_autorite = h
        break
verdict("1.2", "la sortie de la lecture adverse précède TOUT commit qui touche un fichier d'autorité", premier_autorite is not None and ancetre(LECTURE_ADVERSE, premier_autorite) and LECTURE_ADVERSE != premier_autorite[:7],
        f"premier commit d'autorité = {premier_autorite[:7] if premier_autorite else None} ; {LECTURE_ADVERSE} en est ancêtre : {ancetre(LECTURE_ADVERSE, premier_autorite) if premier_autorite else None}")
f_rouges, f_code = noms(ROUGES), noms(CODE)
code_attendu = {"e2e/fixtures/harness.ts", "e2e/specs/d265-socket-perimee.e2e.ts", "neutralisation/neutralize-r45.py"}
verdict("1.3", "LES ROUGES PRÉCÈDENT LE PREMIER COMMIT DE CODE (D334, item 5) : les pièces de rouge ne contiennent aucun fichier de code, et le commit de code seulement les trois attendus",
        ancetre(ROUGES, CODE) and ROUGES != CODE and all(n.startswith("docs/preuves/D343/") for n in f_rouges) and set(f_code) == code_attendu,
        f"{ROUGES} ancêtre de {CODE} : {ancetre(ROUGES, CODE)} ; {len(f_rouges)} fichier(s) de rouge, tous sous docs/preuves/D343/ : {all(n.startswith('docs/preuves/D343/') for n in f_rouges)} ; fichiers du commit de code = {sorted(f_code)}")
premier_code = None
for h in git("log", "--reverse", "--format=%H", f"{DEPART}..HEAD").split():
    if any(not (n.startswith("docs/preuves/") or n in AUTORITE) for n in noms(h)):
        premier_code = h
        break
verdict("1.4", "le premier commit qui touche autre chose que des pièces et des .md d'autorité est le commit de code", premier_code is not None and premier_code.startswith(CODE),
        f"premier commit de code trouvé par le parcours = {premier_code[:7] if premier_code else None} (attendu {CODE})")
sha_passes = re.search(r"SHA: ([0-9a-f]+)", open("docs/preuves/D343/portes/deux-passes-index.txt", encoding="utf-8").read()).group(1)[:7]
verdict("1.5", "LA RÈGLE DES DEUX PASSES est commitée AVANT les passes (celles-ci ont été jouées sur la première écriture d'autorité, qui la suit)", ancetre(REGLE, AUTORITE1) and REGLE != AUTORITE1 and sha_passes == AUTORITE1,
        f"{REGLE} ancêtre de {AUTORITE1} : {ancetre(REGLE, AUTORITE1)} ; l'index des passes porte SHA {sha_passes} (attendu {AUTORITE1})")
verdict("1.6", "les extensions de la table sont chacune SEULE dans leur commit", all(noms(h) == [TABLE] for h in git("log", "--format=%H", "--grep=extension [0-9] de la table", f"{DEPART}..HEAD").split()),
        f"commits « extension N de la table » parcourus : {len(git('log', '--format=%H', '--grep=extension [0-9] de la table', f'{DEPART}..HEAD').split())}")

# 2. LES EMPREINTES DES FICHIERS DE TEST JOUÉS PAR LES ROUGES (D334, item 5)
def empreinte_commit(h: str, chemin: str) -> str:
    r = subprocess.run(["git", "show", f"{h}:{chemin}"], capture_output=True)
    return hashlib.sha256(r.stdout).hexdigest()


def empreintes_de(fichier: str) -> dict:
    d = {}
    for l in open(fichier, encoding="utf-8"):
        m = re.match(r"([0-9a-f]{64})  (\S+)", l)
        if m:
            d[m.group(2)] = m.group(1)
    return d


e_garde = empreintes_de("docs/preuves/D343/reproduction/rouge-avant-garde-empreintes.txt")
e_repro = empreintes_de("docs/preuves/D343/reproduction/rouge-avant-empreintes.txt")
g_ok = e_garde.get("e2e/specs/d265-socket-perimee.e2e.ts") == empreinte_commit(CODE, "e2e/specs/d265-socket-perimee.e2e.ts")
r_ok = e_repro.get("docs/preuves/D343/reproduction/repro-d265.repro.ts") == empreinte_commit(ROUGES, "docs/preuves/D343/reproduction/repro-d265.repro.ts") and e_repro.get("docs/preuves/D343/reproduction/repro.config.ts") == empreinte_commit(ROUGES, "docs/preuves/D343/reproduction/repro.config.ts")
verdict("2.1", "l'empreinte de la GARDE jouée contre l'état d'avant est celle du fichier commité ensuite (octet pour octet, blob de l'index)", g_ok, f"garde : {e_garde.get('e2e/specs/d265-socket-perimee.e2e.ts', '?')[:12]}… = blob de {CODE} : {g_ok}")
verdict("2.2", "les empreintes de la REPRODUCTION (spec et configuration) sont celles des fichiers commités avec les rouges", r_ok, f"repro-d265.repro.ts et repro.config.ts : {r_ok}")

# 3. DIFF ⊆ TABLE, ET CE QUE LE LOT NE TOUCHE PAS
diff = [n for n in git("diff", "--name-only", f"{DEPART}..HEAD").splitlines() if n.strip()]
hors = sorted(n for n in diff if n not in DEC)
verdict("3.1", "git diff <départ>..HEAD --name-only ⊆ la table (chemins complets, extensions comprises)", not hors, f"{len(diff)} fichier(s) dans le diff ; {len(DEC)} chemin(s) déclaré(s) ; hors table : {hors}")
interdits = [n for n in diff if n.startswith("apps/") or n.startswith("packages/") or n.startswith("prisma/") or n == "e2e/playwright.config.ts" or n.endswith("package.json") or n.endswith("pnpm-lock.yaml") or "/migrations/" in n]
verdict("3.2", "R-14 : le lot ne touche NI `apps/`, NI `packages/`, NI `e2e/playwright.config.ts`, NI migration, NI dépendance", not interdits, f"{len(diff)} fichier(s) parcouru(s) ; fichiers interdits : {interdits}")
code_diff = sorted(n for n in diff if not n.startswith("docs/preuves/") and n not in AUTORITE)
verdict("3.3", "le code du lot est EXACTEMENT les trois fichiers déclarés (R-14 : dans e2e/fixtures/ seulement pour la correction)", set(code_diff) == code_attendu, f"fichiers hors pièces et hors .md d'autorité : {code_diff}")
apres_portes = [n for n in git("diff", "--name-only", f"{AUTORITE1}..HEAD").splitlines() if n.strip() and not (n.startswith("docs/preuves/") or n in AUTORITE)]
verdict("3.4", "RIEN QU'UNE PORTE LIT n'a changé depuis les deux passes et les six portes (jouées sur la première écriture d'autorité)", not apres_portes, f"fichiers hors docs/preuves/ et hors .md d'autorité entre {AUTORITE1} et HEAD : {apres_portes}")

# 4. LA TABLE RECOPIÉE À L'IDENTIQUE
cont = open("ZWADJ_CONTINUITE.md", encoding="utf-8", newline="").read().replace("\r\n", "\n")
decale = "\n".join(("###" + l) if l.startswith("#") else l for l in table_texte.rstrip("\n").split("\n"))
verdict("4.1", "la table d'ouverture est recopiée dans ZWADJ_CONTINUITE.md À L'IDENTIQUE (titres décalés de trois niveaux)", decale in cont and cont.count(decale) == 1,
        f"{len(decale.splitlines())} ligne(s) de la table, la copie est présente {cont.count(decale)} fois (attendu 1)")

# 5. ENCODAGE ET FINS DE LIGNE
mojis = []
bases = {}
for f in AUTORITE + ["e2e/fixtures/harness.ts"]:
    avant_f = subprocess.run(["git", "show", f"{DEPART}:{f}"], capture_output=True).stdout.decode("utf-8", errors="replace")
    bases[f] = avant_f.count(FFFD)
    if mojibake(open(f, "rb").read().decode("utf-8"), bases[f]):
        mojis.append(f)
verdict("5.1", "aucun mojibake NOUVEAU dans les trois fichiers d'autorité ni dans le harnais (U+FFFD comparé au départ)", not mojis, f"4 fichier(s) lus ; U+FFFD au départ par fichier : {bases} ; mojibakés : {mojis}")
lf_nus = {}
for f in AUTORITE + ["e2e/fixtures/harness.ts"]:
    b = open(f, "rb").read()
    lf_nus[f] = b.count(b"\n") - b.count(b"\r\n")
verdict("5.2", "les fichiers CRLF le sont restés : 0 LF nu", all(v == 0 for v in lf_nus.values()), f"LF nus par fichier : {lf_nus}")

# 6. LES REGISTRES ET LE COMPTEUR
registre = re.findall(r"^\| (D\d+) \|", cont, re.M)
agents = open("AGENTS.md", encoding="utf-8", newline="").read()
verdict("6.1", "D342 et D343 sont au registre, D343 en dernier", registre[-2:] == ["D342", "D343"], f"{len(registre)} ligne(s) de registre parcourue(s), les deux dernières = {registre[-2:]}")
verdict("6.2", "le compteur POUR MÉMOIRE est à DIX-NEUF dans AGENTS.md", "DIX-HUIT** (R-5 de la consigne du rang 45" in agents and "**→ DIX-NEUF**" in agents, f"annotation « QUATRE → DIX-HUIT … → DIX-NEUF » présente : {'**→ DIX-NEUF**' in agents}")

# 7. LA SYNCHRONISATION (D288) — local et origin SUR LE MÊME SHA
tete, om = git("rev-parse", "HEAD").strip(), git("rev-parse", "origin/main").strip()
verdict("7.1", "local et origin/main sur le MÊME SHA (D288), après git fetch", tete == om, f"HEAD = {tete[:12]} ; origin/main = {om[:12]}")
verdict("7.2", "la fusion de D342 est ancêtre de origin/main et les 107 commits de la branche y sont (origin/front-client en est ancêtre)", ancetre(FUSION, "origin/main") and ancetre(BRANCHE, "origin/main") and ancetre(MAIN_AVANT, "origin/main"),
        f"{FUSION} ancêtre : {ancetre(FUSION, 'origin/main')} ; {BRANCHE[:7]} ancêtre : {ancetre(BRANCHE, 'origin/main')} ; {MAIN_AVANT} (main avant) ancêtre : {ancetre(MAIN_AVANT, 'origin/main')} ; commits de la branche absents de main avant : {git('rev-list', '--count', MAIN_AVANT + '..' + BRANCHE).strip()}")
of, oi = git("rev-parse", "origin/front-client").strip(), git("rev-parse", "origin/integration-45").strip()
verdict("7.3", "R-18 : origin/front-client ET origin/integration-45 existent encore", of.startswith(BRANCHE[:7]) and len(oi) == 40, f"origin/front-client = {of[:7]} (attendu {BRANCHE[:7]}) ; origin/integration-45 = {oi[:7]}")
etat = [l for l in git("status", "--short").splitlines() if l.strip()]
stash = [l for l in git("stash", "list").splitlines() if l.strip()]
verdict("7.4", "arbre propre, aucun stash", not etat and not stash, f"`git status --short` : {len(etat)} ligne(s) ; stash : {len(stash)}")

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
