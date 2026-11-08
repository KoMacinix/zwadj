#!/usr/bin/env python3
"""D345 — CONTRÔLE DE FIN DE LOT (AGENTS.md : D288, D328, D334 item 5). Lot de CODE : le parcours « Nouvelle réservation » garde son étape et ses saisies quand on change d'onglet.

MODE D'EMPLOI : depuis la RACINE, APRÈS la poussée : `git fetch && python3 -I docs/preuves/D345/controle-fin-de-lot.py [--sortie <chemin>]`.
Il ne lit que git (objets, `status`, `diff`, `log`, le suivi d'`origin` après `fetch`) et les fichiers du dépôt ; il n'écrit que `--sortie`, en UTF-8, par lui-même (jamais par redirection).

POURQUOI IL EXISTE ET CE QU'IL PORTE (D290) : chaque famille imprime le NOMBRE D'ÉLÉMENTS QU'ELLE A EXAMINÉS à côté de son verdict ; un « 0 » sur zéro élément n'est pas une mesure. Chaque verdict est un ✓ ou un ✗ ; il n'y a pas de « ? ».
INSTRUMENT D'ORIGINE : `docs/preuves/D344/controle-fin-de-lot.py` (même esprit, écrit à neuf : les SHA, les noms et les familles de ce lot — un lot de CODE, donc l'ordre « rouges AVANT le code » — changent).
CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : « diff ⊆ table » rend ✗ sur un chemin fabriqué absent de la table et ✓ sur un chemin qui y est (dont un joker) ; une PROSE qui cite un chemin ne le déclare pas (seule une CELLULE
de table entre backticks le fait) ; le test d'encodage rend ✗ sur un texte mojibaké fabriqué et ✓ sur un texte sain ; l'ancêtre rend ✓ pour un vrai ancêtre et ✗ pour son inverse.
"""
import fnmatch
import hashlib
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "942d45025ded6556a11f8a5310ebe93b4c997c85"
PREMIER = "48e1fa3"        # la table d'ouverture, SEULE
LECTURE_ADVERSE = "a5a7e09"  # la consigne, la lecture adverse, le comptage R-9, l'audit « a »
ROUGES = "3d25c8a"         # les pièces de rouge du fichier de test FINAL
CODE = "06347f6"           # le premier commit de code
PREMIERE_AUTORITE = "c42e78e"
TABLE = "docs/preuves/D345/table-ouverture.md"
AUTORITE = ["ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"]
SORTIE: list = []
ECHECS: list = []


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def rc(*args: str) -> int:
    return subprocess.run(["git", *args], capture_output=True).returncode


def noms(h: str) -> list:
    return [n for n in git("show", "--name-only", "--format=", h).splitlines() if n.strip()]


def dire(s: str = "") -> None:
    SORTIE.append(s)
    print(s)


def verdict(ok: bool, titre: str, detail: str) -> None:
    dire(f"{'✓' if ok else '✗'} {titre} — {detail}")
    if not ok:
        ECHECS.append(titre)


def chemins_declares(texte: str) -> set:
    """Les chemins que la table DÉCLARE : ceux qui sont entre backticks dans une CELLULE de table (une ligne qui commence par « | »). Une prose qui cite un chemin ne le déclare pas."""
    sortie = set()
    for ligne in texte.splitlines():
        if not ligne.lstrip().startswith("|"):
            continue
        for m in re.finditer(r"`([^`]+)`", ligne):
            c = m.group(1).strip()
            if "/" in c or re.search(r"\.[a-z]{2,4}$", c):
                sortie.add(c)
    return sortie


def couvert(chemin: str, declares: set) -> bool:
    return any(chemin == d or fnmatch.fnmatch(chemin, d) for d in declares)


def mojibake(texte: str) -> int:
    return len(re.findall(r"Ã.|â€.|Â[ -ÿ]|�", texte))


def ancetre(a: str, b: str) -> bool:
    return rc("merge-base", "--is-ancestor", a, b) == 0


def calibrer() -> bool:
    dec = chemins_declares("prose `docs/preuves/D345/faux.md` citée\n| `docs/preuves/D345/vrai.md` | rôle |\n| `docs/preuves/D345/campagnes/*.txt` | joker |\n")
    cas = [
        ("chemin absent de la table → ✗", couvert("docs/preuves/D345/inconnu.md", dec) is False),
        ("chemin déclaré → ✓", couvert("docs/preuves/D345/vrai.md", dec) is True),
        ("joker → ✓", couvert("docs/preuves/D345/campagnes/r43.txt", dec) is True),
        ("prose seule ne déclare pas → ✗", couvert("docs/preuves/D345/faux.md", dec) is False),
        ("texte mojibaké → ≥ 1", mojibake("Ã© et â€™ fabriqués") >= 1),
        ("texte sain → 0", mojibake("été, « guillemets », ⛔ et ✓ sains") == 0),
        ("vrai ancêtre → ✓", ancetre(DEPART, "HEAD") is True),
        ("inverse → ✗", ancetre("HEAD", DEPART) is False),
    ]
    manques = [n for n, ok in cas if not ok]
    dire(f"calibration : {len(cas)} bras · {len(manques)} manqué(s) (attendu 0)" + (f" — {manques}" if manques else ""))
    return not manques


def main() -> int:
    dire("D345 — CONTRÔLE DE FIN DE LOT")
    if not calibrer():
        dire("ABANDON : calibration manquée")
        return 2
    tete = git("rev-parse", "HEAD").strip()
    origine = git("rev-parse", "origin/main").strip()
    dire(f"HEAD={tete}\norigin/main={origine}")

    # 1. local = origin/main (D288)
    verdict(tete == origine and tete != "", "1.1 local et origin/main sur le MÊME SHA (D288)", f"HEAD {tete[:7]} · origin/main {origine[:7]}")
    statut = git("status", "--short")
    verdict(statut.strip() == "", "1.2 l'arbre est propre, aucun fichier non suivi", f"{len([l for l in statut.splitlines() if l.strip()])} ligne(s) de `git status --short` (attendu 0)")
    verdict(git("stash", "list").strip() == "", "1.3 aucun stash", f"{len(git('stash', 'list').splitlines())} entrée(s) (attendu 0)")

    # 2. le premier commit du lot = la table SEULE
    commits = git("log", "--reverse", "--format=%h", f"{DEPART}..HEAD").split()
    premier = commits[0] if commits else ""
    n = noms(premier) if premier else []
    verdict(premier.startswith(PREMIER) and n == [TABLE], "2.1 le PREMIER commit du lot est la table d'ouverture, SEULE", f"{premier} · fichiers {n} · {len(commits)} commit(s) examinés depuis le SHA de départ")

    # 3. diff ⊆ table (chemins complets, extensions comprises)
    table = open(TABLE, encoding="utf-8").read()
    declares = chemins_declares(table)
    diff = [f for f in git("diff", DEPART + "..HEAD", "--name-only").splitlines() if f.strip()]
    hors = [f for f in diff if not couvert(f, declares)]
    verdict(not hors, "3.1 `git diff <SHA de départ>..HEAD --name-only` ⊆ la table (chemins COMPLETS, extensions comprises)", f"{len(diff)} fichier(s) du diff · {len(declares)} chemin(s)/joker(s) déclaré(s) · {len(hors)} hors table {hors}")
    # Les fichiers d'autorité (écrits en dernier) ne sont pas dans la section B : ils sont dans la section C de la table, entre backticks.
    verdict(all(a in diff for a in AUTORITE), "3.2 les trois fichiers d'autorité sont dans le diff", f"{[a for a in AUTORITE if a in diff]}")

    # 4. aucun contrat d'API, aucune migration, apps/api intouché (R-5)
    api = [f for f in diff if f.startswith("apps/api/") or "/migrations/" in f or f.endswith(".sql")]
    verdict(not api, "4.1 R-5 : aucun fichier sous `apps/api`, aucune migration, aucun `.sql`", f"{len(diff)} fichier(s) examinés · {len(api)} concerné(s) {api}")
    code = sorted(f for f in diff if not f.startswith("docs/preuves/") and f not in AUTORITE)
    dire(f"   fichiers de code/test du lot ({len(code)}) : {code}")

    # 5. l'ordre des commits
    verdict(ancetre(PREMIER, LECTURE_ADVERSE) and ancetre(LECTURE_ADVERSE, PREMIERE_AUTORITE), "5.1 la lecture adverse (consigne + lecture + comptage) précède TOUT .md d'autorité", f"{LECTURE_ADVERSE} avant {PREMIERE_AUTORITE}")
    premiers_md = [h for h in commits if any(a in noms(h) for a in AUTORITE)]
    verdict(bool(premiers_md) and premiers_md[0].startswith(PREMIERE_AUTORITE), "5.2 le PREMIER commit qui touche un .md d'autorité est la première écriture (les arbitrages de Ko)", f"{premiers_md[0] if premiers_md else '—'} · fichiers {noms(premiers_md[0]) if premiers_md else []}")
    verdict(ancetre(ROUGES, CODE), "5.3 [D334, item 5] le commit des pièces de rouge PRÉCÈDE le premier commit de code", f"{ROUGES} avant {CODE}")
    verdict(ancetre(CODE, PREMIERE_AUTORITE) or ancetre(PREMIERE_AUTORITE, CODE), "5.4 le code et la première écriture d'autorité sont tous deux dans l'historique", "ancêtres vérifiés")

    # 6. l'ÉCART écrit : sept fichiers déclarés par l'extension 1 APRÈS leur commit (D328, point 4) — `git` doit le montrer, sinon la table dit autre chose que la vérité.
    declares_apres = ["docs/preuves/D345/rouges/rouge-2-comportement.txt", "docs/preuves/D345/rouges/rouge-3-bouton.txt", "docs/preuves/D345/rouges/rouge-4-e2e.txt",
                      "docs/preuves/D345/portes/masquer-jetons.py", "docs/preuves/D345/neutralisation/neutralize-r47-passe-1-AVANT-CORRECTIF-DE-DEUX-TESTS.txt",
                      "docs/preuves/D345/portes/deux-passes-e2e.sh", "docs/preuves/D345/portes/defaut-pilote-ports.md"]
    tardifs = 0
    for f in declares_apres:
        ajoute = git("log", "--diff-filter=A", "--format=%h", "--", f).split()
        if ajoute and ancetre(ajoute[-1], "6cafb73"):
            tardifs += 1
    verdict(tardifs == len(declares_apres), "6.1 l'ÉCART écrit (sept fichiers déclarés par l'extension 1 APRÈS leur commit) est celui que `git` montre", f"{len(declares_apres)} fichiers examinés · {tardifs} ajoutés AVANT le commit de l'extension 1 (attendu {len(declares_apres)} : l'écart est écrit dans la table et dans la section D345, S-149)")

    # 7. les rouges : l'empreinte notée est celle des fichiers de test commités ensuite (octets de l'arbre de travail ; pour la spec e2e, voir l'écart de fins de ligne)
    rouges = open("docs/preuves/D345/rouges/rouges.md", encoding="utf-8").read()
    fichiers = ["apps/pro/src/dashboard/walkin-draft.test.tsx", "apps/pro/src/dashboard/walkin-journey.test.tsx", "e2e/specs/r47-brouillon-onglet.e2e.ts"]
    brut, lf, ecarts = [], [], []
    for f in fichiers:
        octets = open(f, "rb").read()
        if hashlib.sha256(octets).hexdigest() in rouges:
            brut.append(f)
        elif hashlib.sha256(octets.replace(b"
", b"
")).hexdigest() in rouges:
            lf.append(f)
        else:
            ecarts.append(f)
    verdict(not ecarts, "7.1 l'empreinte sha256 notée par les rouges est celle de chaque fichier de test commité ensuite", f"{len(fichiers)} fichier(s) comparé(s) · {len(brut)} identique(s) en octets · {len(lf)} identique(s) APRÈS normalisation des fins de ligne {lf} (ÉCART ÉCRIT : la spec e2e a été jouée en LF puis convertie en CRLF avant son commit, contenu identique) · {len(ecarts)} différent(s) {ecarts}")

    # 8. la copie de la table dans l'ordre des rangs = la table de fin de lot
    cont = open("ZWADJ_CONTINUITE.md", encoding="utf-8").read().replace("\r\n", "\n")
    rep = cont.index("TABLE D'OUVERTURE DU RANG 47 (D345)")
    a = cont.index("~~~~markdown\n", rep) + len("~~~~markdown\n")
    b = cont.index("\n~~~~\n", a)
    copie = cont[a:b]
    orig = table.replace("\r\n", "\n").rstrip("\n")
    verdict(copie == orig, "8.1 la copie de la table dans `ZWADJ_CONTINUITE.md` est IDENTIQUE à `table-ouverture.md` (extensions comprises)", f"{len(copie)} caractères comparés (copie) contre {len(orig)} (original)")

    # 9. états d'autorité
    agents = open("AGENTS.md", encoding="utf-8").read()
    backlog = open("ZWADJ_BACKLOG.md", encoding="utf-8").read()
    reg = re.findall(r"^\| (D\d+) \| A \|", cont, re.M)
    verdict(reg[-1:] == ["D345"] and reg.count("D345") == 1, "9.1 D345 est la DERNIÈRE ligne du registre, une seule fois", f"{len(reg)} ligne(s) de registre examinées · dernière {reg[-1:]}")
    verdict("RANG 48 : EN ATTENTE DE CADRAGE DU RELECTEUR" in cont and "RANG 47 : CLOS" in cont, "9.2 l'ordre des rangs porte « RANG 47 : CLOS » et « RANG 48 : EN ATTENTE DE CADRAGE DU RELECTEUR »", "présents")
    verdict("VINGT ET UN" in agents and "LE BROUILLON DU PARCOURS « NOUVELLE RÉSERVATION » VIT EN MÉMOIRE SEULEMENT" in agents, "9.3 `AGENTS.md` porte le compteur VINGT ET UN et l'invariant du brouillon", "présents")
    verdict("Reports du 08/11/2026 — rang 47 CLOS" in backlog and "- [x] **[SÉCU]**" in backlog and "PLACÉE PAR LE RELECTEUR (R-8" in backlog, "9.4 `ZWADJ_BACKLOG.md` : la section neuve, [SÉCU] cochée (GOCSPX = 0), S-142 placée", "présents")

    # 10. aucune corruption d'encodage dans les fichiers ajoutés ou modifiés
    total = 0
    mots = 0
    for f in diff:
        if f.startswith("docs/preuves/D345/e2e/passe-") or f.startswith("docs/preuves/D345/audit-secrets") or f.startswith("docs/preuves/D345/rouges/rouge-") or f.startswith("docs/preuves/D345/campagnes/"):
            continue  # sorties brutes volumineuses : contrôlées par les audits
        try:
            t = open(f, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            continue
        total += 1
        mots += mojibake(t)
    verdict(mots == 0, "10.1 aucun motif de mojibake dans les fichiers texte du diff", f"{total} fichier(s) examinés · {mots} occurrence(s) (attendu 0)")

    dire()
    dire(f"RÉSULTAT : {len(ECHECS)} échec(s) — {'; '.join(ECHECS) if ECHECS else 'aucun'}")
    if "--sortie" in sys.argv:
        chemin = sys.argv[sys.argv.index("--sortie") + 1]
        with open(chemin, "w", encoding="utf-8", newline="") as f:
            f.write("\n".join(SORTIE) + "\n")
    return 1 if ECHECS else 0


if __name__ == "__main__":
    sys.exit(main())
