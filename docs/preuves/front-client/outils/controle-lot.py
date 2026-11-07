#!/usr/bin/env python3
"""CONTRÔLE DE FIN DE LOT — session `front-client`. Une PIÈCE versée qui sert d'outil (né avec FC-1, servi aux lots suivants).

Usage, depuis la RACINE du monorepo :
    python3 docs/preuves/front-client/outils/controle-lot.py <LOT> <SHA de départ du lot>
    python3 docs/preuves/front-client/outils/controle-lot.py --calibration
Codes : 0 = les quatre contrôles tiennent ; 1 = un contrôle échoue ; 2 = ABANDON (calibration manquée, table illisible).

Ce qu'il vérifie (consigne de la session, § 2 ; AGENTS.md, ordre des commits D328 et D334 item 5) — et ce qu'il a PARCOURU (D290) :
  1. le PREMIER commit après le SHA de départ ne contient QUE `docs/preuves/front-client/<LOT>/table-ouverture.md` ;
  2. tout AUTRE commit qui touche la table ne touche QU'ELLE (une extension se commite seule, avant son fichier) ;
  3. ROUGES AVANT LE CODE : le premier commit qui porte un fichier de CODE de produit (sous `apps/` ou `packages/`, hors fichiers
     de test) vient APRÈS le premier commit qui porte une pièce de rouge (`docs/preuves/front-client/<LOT>/rouges/`) — un lot
     sans code de produit (arrêté, déjà fait) est dit tel, sans verdict sur ce point ;
  4. DIFF ⊆ TABLE : chaque fichier du diff `<départ>..HEAD`, plus ce qui n'est pas commité, est un chemin de la table (cellules
     entre accents graves des lignes « | n | … »), extensions comprises.
CALIBRATION (rejouée à chaque lancement, abandon si un bras manque, D286) : l'extracteur de chemins sur une table synthétique
(positif : le chemin d'une ligne est vu ; négatif : un chemin cité HORS d'une ligne de table ne l'est pas) ; le classement des
fichiers (code de produit, test, pièce) sur des noms dont la réponse est connue.
"""
import re
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

LIGNE_DE_TABLE = re.compile(r"^\|\s*\d+\s*\|")
CHEMIN = re.compile(r"`([^`\s]+/[^`\s]+)`")
TEST = re.compile(r"(\.test\.|\.spec\.|[\\/]test-setup\.|[\\/]test-support[\\/]|[\\/]test[\\/]int[\\/])")


def chemins_de_table(texte: str) -> set[str]:
    return {m for l in texte.splitlines() if LIGNE_DE_TABLE.match(l) for m in CHEMIN.findall(l.split("|")[2] if l.count("|") > 2 else "")}


def est_code_produit(chemin: str) -> bool:
    return chemin.startswith(("apps/", "packages/")) and not TEST.search(chemin)


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8").stdout


def calibrer() -> bool:
    table = ("| # | fichier | rôle |\n|---|---|---|\n| 1 | `docs/x/table.md` | la table |\n| 2 | `apps/a/b.ts` | code |\n"
             "Hors table : `apps/hors/table.ts` est cité en prose.\n")
    bras = [
        ("extracteur, positif : les deux chemins des lignes de table", chemins_de_table(table) >= {"docs/x/table.md", "apps/a/b.ts"}, True),
        ("extracteur, négatif : le chemin cité en prose n'est PAS dans la table", "apps/hors/table.ts" in chemins_de_table(table), False),
        ("classement : un composant est du code de produit", est_code_produit("apps/client/src/components/x.tsx"), True),
        ("classement : un test n'est pas du code de produit", est_code_produit("apps/client/src/components/x.test.tsx"), False),
        ("classement : une pièce n'est pas du code de produit", est_code_produit("docs/preuves/front-client/FC-1/rapport.md"), False),
        ("classement : une feuille de style est du code de produit", est_code_produit("apps/client/src/app/theme.css"), True),
    ]
    manques = 0
    for nom, obtenu, attendu in bras:
        manques += obtenu != attendu
        print(f"  calibration {'✓' if obtenu == attendu else '✗'} {nom} : {obtenu} (attendu {attendu})")
    print(f"  calibration : {len(bras)} bras · {manques} manqué(s) (attendu 0)")
    return manques == 0


def main(argv: list[str]) -> int:
    if not calibrer():
        print("✗ ABANDON : calibration manquée.")
        return 2
    if argv[:1] == ["--calibration"]:
        return 0
    lot, depart = argv[0], argv[1]
    table_chemin = f"docs/preuves/front-client/{lot}/table-ouverture.md"
    commits = git("rev-list", "--reverse", f"{depart}..HEAD").split()
    print(f"lot {lot} · départ {depart[:7]} · HEAD {git('rev-parse', 'HEAD').strip()[:7]} · commits parcourus : {len(commits)}")
    fichiers_par_commit = [(c, [f for f in git("show", "--name-only", "--format=", c).splitlines() if f]) for c in commits]
    echecs = 0

    # 1.
    premier = fichiers_par_commit[0] if fichiers_par_commit else None
    ok1 = premier is not None and premier[1] == [table_chemin]
    echecs += not ok1
    print(f"{'✓' if ok1 else '✗'} 1. premier commit = la table SEULE : {premier[0][:7] if premier else '—'} → {premier[1] if premier else '—'}")

    # 2.
    touche_table = [(c, fs) for c, fs in fichiers_par_commit[1:] if table_chemin in fs]
    mauvais = [(c, fs) for c, fs in touche_table if fs != [table_chemin]]
    echecs += bool(mauvais)
    print(f"{'✓' if not mauvais else '✗'} 2. extensions de la table, chacune SEULE : {len(touche_table)} commit(s) examiné(s), "
          f"{len(mauvais)} mêlé(s) à d'autres fichiers (attendu 0)")

    # 3.
    rang = {c: i for i, (c, _) in enumerate(fichiers_par_commit)}
    rouges = [c for c, fs in fichiers_par_commit if any(f.startswith(f"docs/preuves/front-client/{lot}/rouges/") for f in fs)]
    code = [c for c, fs in fichiers_par_commit if any(est_code_produit(f) for f in fs)]
    if not code:
        print("— 3. aucun commit de code de produit dans ce lot : rien à ordonner")
    else:
        ok3 = bool(rouges) and rang[rouges[0]] < rang[code[0]]
        echecs += not ok3
        print(f"{'✓' if ok3 else '✗'} 3. rouges avant le code : premier commit de rouges {rouges[0][:7] if rouges else '—'} "
              f"(rang {rang[rouges[0]] if rouges else '—'}) · premier commit de code {code[0][:7]} (rang {rang[code[0]]})")

    # 4.
    table = chemins_de_table(open(table_chemin, encoding="utf-8").read())
    diff = {f for f in git("diff", "--name-only", f"{depart}..HEAD").splitlines() if f}
    hors_commit = {l[3:] for l in git("status", "--porcelain", "--untracked-files=all").splitlines() if l}
    tous = diff | hors_commit
    hors = sorted(tous - table)
    echecs += bool(hors)
    print(f"{'✓' if not hors else '✗'} 4. diff ⊆ table : {len(tous)} fichier(s) examiné(s) ({len(diff)} commités, {len(hors_commit)} non "
          f"commités) contre {len(table)} chemin(s) de la table · hors table : {len(hors)} (attendu 0)")
    for f in hors:
        print(f"     hors table : {f}")
    absents = sorted(table - tous)
    print(f"  (information) chemins de la table absents du diff : {len(absents)}" + (f" — {', '.join(absents)}" if absents else ""))
    return 1 if echecs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
