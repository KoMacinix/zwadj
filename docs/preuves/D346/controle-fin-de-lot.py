#!/usr/bin/env python3
"""D346 — CONTRÔLE DE FIN DE LOT (AGENTS.md : D288, D328, D334 item 5). Lot de CODE : le panneau de filtres de `/salles` suit l'adresse quand l'assistant répond.

MODE D'EMPLOI : depuis la RACINE, APRÈS la poussée : `git fetch && python3 -I docs/preuves/D346/controle-fin-de-lot.py [--sortie <chemin>]`.
Il ne lit que git (objets, `status`, `diff`, `log`, le suivi d'`origin` après `fetch`) et les fichiers du dépôt ; il n'écrit que `--sortie`, en UTF-8, par lui-même.

POURQUOI IL EXISTE ET CE QU'IL PORTE (D290) : chaque famille imprime le NOMBRE D'ÉLÉMENTS QU'ELLE A EXAMINÉS à côté de son verdict ; un « 0 » sur zéro élément n'est pas une mesure.
INSTRUMENT D'ORIGINE : `docs/preuves/D345/controle-fin-de-lot.py` (même esprit, écrit à neuf : les SHA, les noms et les familles de ce lot). Archivé comme preuve, jamais promu en instrument (D291).
CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : « diff ⊆ table » rend ✗ sur un chemin fabriqué absent de la table et ✓ sur un chemin déclaré (dont un joker) ; une prose qui cite
un chemin ne le déclare pas ; le test d'encodage rend ✗ sur un texte mojibaké fabriqué et ✓ sur un texte sain ; l'ancêtre rend ✓ pour un vrai ancêtre et ✗ pour son inverse.
"""
import fnmatch
import hashlib
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "caa5e4cf4a8791b70d76acb4dd0a75ae1b75c15a"
PREMIER = "7712831"           # la table d'ouverture, SEULE
LECTURE_ADVERSE = "816d435"   # la consigne, la lecture adverse, l'audit « a »
ROUGES = ["1f95e06", "57fe8a5"]  # les pièces de rouge (puis le rouge amendé : un test par champ)
CODE = "a209b6c"              # le premier commit de code
PREMIERE_AUTORITE = "5a703f3"  # la clôture dans les trois fichiers d'autorité
TABLE = "docs/preuves/D346/table-ouverture.md"
AUTORITE = ["ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"]
CODE_ATTENDU = ["apps/client/src/components/search/search-view.test.tsx", "apps/client/src/components/search/search-view.tsx",
                "e2e/specs/r48-assistant-choix.e2e.ts", "neutralisation/neutralize-r48.py"]
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
    return len(re.findall(r"Ã.|â€.|Â[ -ÿ]|�", texte))


def ancetre(a: str, b: str) -> bool:
    return rc("merge-base", "--is-ancestor", a, b) == 0


def calibrer() -> bool:
    dec = chemins_declares("prose `docs/preuves/D346/faux.md` citée\n| `docs/preuves/D346/vrai.md` | rôle |\n| `docs/preuves/D346/campagnes/*.txt` | joker |\n")
    cas = [
        ("chemin absent de la table → ✗", couvert("docs/preuves/D346/inconnu.md", dec) is False),
        ("chemin déclaré → ✓", couvert("docs/preuves/D346/vrai.md", dec) is True),
        ("joker → ✓", couvert("docs/preuves/D346/campagnes/fc8.txt", dec) is True),
        ("prose seule ne déclare pas → ✗", couvert("docs/preuves/D346/faux.md", dec) is False),
        ("texte mojibaké → ≥ 1", mojibake("Ã© et â€™ fabriqués") >= 1),
        ("texte sain → 0", mojibake("été, « guillemets », ⛔ et ✓ sains") == 0),
        ("vrai ancêtre → ✓", ancetre(DEPART, "HEAD") is True),
        ("inverse → ✗", ancetre("HEAD", DEPART) is False),
    ]
    manques = [n for n, ok in cas if not ok]
    dire(f"calibration : {len(cas)} bras · {len(manques)} manqué(s) (attendu 0)" + (f" — {manques}" if manques else ""))
    return not manques


def main() -> int:
    dire("D346 — CONTRÔLE DE FIN DE LOT")
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
    sur_table = git("log", "--reverse", "--format=%h", "--", TABLE).split()
    seules = [h for h in sur_table if noms(h) == [TABLE]]
    verdict(len(sur_table) >= 3 and seules == sur_table, "2.2 chaque commit qui touche la table (ouverture, extensions) la touche SEULE", f"{len(sur_table)} commit(s) sur la table : {sur_table} · {len(seules)} seul(s)")

    # 3. diff ⊆ table (chemins complets, extensions comprises)
    table = open(TABLE, encoding="utf-8").read()
    declares = chemins_declares(table)
    diff = [f for f in git("diff", DEPART + "..HEAD", "--name-only").splitlines() if f.strip()]
    hors = [f for f in diff if not couvert(f, declares)]
    verdict(not hors, "3.1 `git diff <SHA de départ>..HEAD --name-only` ⊆ la table (chemins COMPLETS, extensions comprises)", f"{len(diff)} fichier(s) du diff · {len(declares)} chemin(s)/joker(s) déclaré(s) · {len(hors)} hors table {hors}")
    verdict(all(a in diff for a in AUTORITE), "3.2 les trois fichiers d'autorité sont dans le diff", f"{[a for a in AUTORITE if a in diff]}")

    # 4. aucun contrat d'API, aucune migration, apps/api et apps/pro intouchés (R-5)
    interdit = [f for f in diff if f.startswith(("apps/api/", "apps/pro/")) or "/migrations/" in f or f.endswith(".sql")]
    verdict(not interdit, "4.1 R-5 : aucun fichier sous `apps/api` ni `apps/pro`, aucune migration, aucun `.sql`", f"{len(diff)} fichier(s) examinés · {len(interdit)} concerné(s) {interdit}")
    code = sorted(f for f in diff if not f.startswith("docs/preuves/") and f not in AUTORITE)
    verdict(code == sorted(CODE_ATTENDU), "4.2 les fichiers de code et de test du lot sont EXACTEMENT les quatre attendus", f"{len(code)} fichier(s) : {code}")

    # 5. l'ordre des commits
    verdict(ancetre(PREMIER, LECTURE_ADVERSE) and ancetre(LECTURE_ADVERSE, PREMIERE_AUTORITE), "5.1 la lecture adverse (consigne + lecture + audit) précède TOUT .md d'autorité", f"{LECTURE_ADVERSE} avant {PREMIERE_AUTORITE}")
    premiers_md = [h for h in commits if any(a in noms(h) for a in AUTORITE)]
    verdict(len(premiers_md) == 1 and premiers_md[0].startswith(PREMIERE_AUTORITE), "5.2 UN SEUL commit touche les .md d'autorité, et c'est la clôture", f"{premiers_md} · {len(commits)} commit(s) examinés")
    verdict(all(ancetre(r, CODE) for r in ROUGES) and ROUGES[0] != CODE, "5.3 [D334, item 5] les commits des pièces de rouge (et le rouge amendé) PRÉCÈDENT le premier commit de code", f"{ROUGES} avant {CODE}")
    premier_code = [h for h in commits if set(noms(h)) & {"apps/client/src/components/search/search-view.tsx", "neutralisation/neutralize-r48.py"}]
    verdict(bool(premier_code) and premier_code[0].startswith(CODE), "5.4 le PREMIER commit qui touche `search-view.tsx` ou le harnais est le commit de code attendu", f"{premier_code[:1]}")

    # 6. l'ÉCART écrit : deux fichiers de rouge déclarés par l'extension 1 APRÈS leur commit ; les trois de l'extension 2 déclarés AVANT le leur (D328, point 4).
    ext1, ext2 = (sur_table[1], sur_table[2]) if len(sur_table) >= 3 else ("", "")
    apres = ["docs/preuves/D346/rouges/rouge-1-composant.txt", "docs/preuves/D346/rouges/rouge-2-navigateur.txt"]
    tardifs = sum(1 for f in apres if (a := git("log", "--diff-filter=A", "--format=%h", "--", f).split()) and ancetre(a[-1], ext1))
    verdict(tardifs == len(apres), "6.1 l'ÉCART écrit (deux fichiers de rouge déclarés par l'extension 1 APRÈS leur commit) est celui que `git` montre", f"{len(apres)} fichier(s) examinés · {tardifs} ajoutés AVANT l'extension 1 ({ext1})")
    avant = ["docs/preuves/D346/aucune-valeur-reelle.txt", "docs/preuves/D346/tri-audit-d346c.txt", "docs/preuves/D346/controle-fin-de-lot.py"]
    precedes = sum(1 for f in avant if (a := git("log", "--diff-filter=A", "--format=%h", "--", f).split()) and ancetre(ext2, a[-1]) and ext2 != a[-1])
    verdict(precedes == len(avant), "6.2 les trois fichiers de l'extension 2 sont commités APRÈS elle (la règle D328 point 4 est tenue pour eux)", f"{len(avant)} fichier(s) examinés · {precedes} postérieurs à l'extension 2 ({ext2})")
    pieces_ext1 = [f for f in ("docs/preuves/D346/portes/typecheck.txt", "docs/preuves/D346/portes/lint.txt", "docs/preuves/D346/portes/test.txt", "docs/preuves/D346/portes/build.txt",
                               "docs/preuves/D346/portes/test-int.txt", "docs/preuves/D346/portes/_index.txt", "docs/preuves/D346/portes/etat-machine-pendant.txt",
                               "docs/preuves/D346/e2e/passe-2-batterie-avant.txt", "docs/preuves/D346/e2e/passe-2-batterie-apres.txt", "docs/preuves/D346/campagnes/available-on.txt",
                               "docs/preuves/D346/campagnes/horizon.txt", "docs/preuves/D346/campagnes/fc8.txt", "docs/preuves/D346/campagnes/fc8-e2e.txt", "docs/preuves/D346/audit-secrets-d346c.txt")]
    posterieurs = sum(1 for f in pieces_ext1 if (a := git("log", "--diff-filter=A", "--format=%h", "--", f).split()) and ancetre(ext1, a[-1]) and ext1 != a[-1])
    verdict(posterieurs == len(pieces_ext1), "6.3 les quatorze pièces « à venir » de l'extension 1 sont commitées APRÈS elle", f"{len(pieces_ext1)} fichier(s) examinés · {posterieurs} postérieurs à l'extension 1 ({ext1})")

    # 7. les rouges : l'empreinte notée est celle des fichiers de test commités (octets de l'arbre de travail)
    rouges = open("docs/preuves/D346/rouges/rouges.md", encoding="utf-8").read()
    fichiers = ["apps/client/src/components/search/search-view.test.tsx", "e2e/specs/r48-assistant-choix.e2e.ts"]
    ident, ecarts = [], []
    for f in fichiers:
        if hashlib.sha256(open(f, "rb").read()).hexdigest() in rouges:
            ident.append(f)
        else:
            ecarts.append(f)
    verdict(not ecarts, "7.1 l'empreinte sha256 notée par les rouges est celle de chaque fichier de test commité", f"{len(fichiers)} fichier(s) comparé(s) · {len(ident)} identique(s) en octets · écarts {ecarts}")

    # 8. la copie de la table dans l'ordre des rangs = la table de fin de lot
    cont = open("ZWADJ_CONTINUITE.md", encoding="utf-8").read().replace("\r\n", "\n")
    rep = cont.index("### 6. La table d'ouverture, recopiée à l'identique")
    a = cont.index("~~~~\n", rep) + len("~~~~\n")
    b = cont.index("\n~~~~\n", a)
    copie = cont[a:b]
    orig = table.replace("\r\n", "\n").rstrip("\n")
    verdict(copie == orig, "8.1 la copie de la table dans `ZWADJ_CONTINUITE.md` est IDENTIQUE à `table-ouverture.md` (extensions comprises)", f"{len(copie)} caractères comparés (copie) contre {len(orig)} (original)")

    # 9. états d'autorité
    agents = open("AGENTS.md", encoding="utf-8").read()
    backlog = open("ZWADJ_BACKLOG.md", encoding="utf-8").read()
    reg = re.findall(r"^\| (D\d+) \| A \|", cont, re.M)
    verdict(reg[-1:] == ["D346"] and reg.count("D346") == 1, "9.1 D346 est la DERNIÈRE ligne du registre, une seule fois", f"{len(reg)} ligne(s) de registre examinées · dernière {reg[-1:]}")
    verdict("⇒ **RANG 48 : CLOS" in cont and "⇒ **RANG 49 : EN ATTENTE DE CADRAGE DU RELECTEUR.**" in cont and "~~**RANG 48 : EN ATTENTE DE CADRAGE DU RELECTEUR.**~~" in cont,
            "9.2 l'ordre des rangs porte « RANG 48 : CLOS », « RANG 49 : EN ATTENTE DE CADRAGE DU RELECTEUR » et barre l'ancienne attente", "présents")
    verdict("VINGT-DEUX" in agents and "D346, 09/11/2026 : **RANG 48 CLOS" in agents, "9.3 `AGENTS.md` porte le compteur VINGT-DEUX et l'annotation de clôture", "présents")
    verdict("## Reports du 09/11/2026 — rang 48 CLOS" in backlog and "R-7 de la consigne du rang 48 — ANNOTATION ADDITIVE" in backlog, "9.4 `ZWADJ_BACKLOG.md` : la section neuve et l'annotation de L36-4 (R-7)", "présents")

    # 10. aucune corruption d'encodage dans ce que le lot a ÉCRIT : lignes AJOUTÉES des .md d'autorité, fichiers neufs hors sorties brutes
    total, mots, lignes = 0, 0, 0
    for f in AUTORITE:
        ajoutees = [l[1:] for l in git("diff", DEPART + "..HEAD", "-U0", "--", f).splitlines() if l.startswith("+") and not l.startswith("+++")]
        lignes += len(ajoutees)
        mots += mojibake(chr(10).join(ajoutees))
        total += 1
    brutes = ("docs/preuves/D346/e2e/passe-", "docs/preuves/D346/audit-secrets", "docs/preuves/D346/rouges/rouge-", "docs/preuves/D346/campagnes/", "docs/preuves/D346/portes/",
              "docs/preuves/D346/neutralisation/", "docs/preuves/D346/aucune-valeur-reelle", "docs/preuves/D346/controle-fin-de-lot.py")
    for f in diff:
        if f in AUTORITE or f.startswith(brutes):
            continue
        try:
            t = open(f, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            continue
        total += 1
        lignes += t.count(chr(10))
        mots += mojibake(t)
    verdict(mots == 0, "10.1 aucun motif de mojibake dans ce que le lot a écrit (lignes ajoutées des .md d'autorité, fichiers neufs hors sorties brutes)", f"{total} fichier(s) examinés · {lignes} ligne(s) · {mots} occurrence(s) (attendu 0)")

    dire()
    dire(f"RÉSULTAT : {len(ECHECS)} échec(s) — {'; '.join(ECHECS) if ECHECS else 'aucun'}")
    if "--sortie" in sys.argv:
        chemin = sys.argv[sys.argv.index("--sortie") + 1]
        with open(chemin, "w", encoding="utf-8", newline="") as f:
            f.write("\n".join(SORTIE) + "\n")
    return 1 if ECHECS else 0


if __name__ == "__main__":
    sys.exit(main())
