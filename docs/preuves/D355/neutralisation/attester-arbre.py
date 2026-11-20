#!/usr/bin/env python3
"""Atteste « le MÊME arbre » (consigne du rang 57, § 3 ; règle des portes de D355, § 4.1) : à l'entrée et à la sortie de chaque campagne et de chaque porte, le dépôt est PROPRE et les fichiers de code mesurés sont ceux du
commit de code. Usage, depuis la RACINE : python3 attester-arbre.py <SHA du commit de code> <moment, ex. « entrée de la campagne r57 »>.
Imprime, pour le moment dit : l'heure, `HEAD` et l'objet-arbre de `HEAD`, le nombre de lignes de `git status --porcelain --untracked-files=all` (attendu 0 ; les journaux de neutralisation sont ignorés par git), et le nombre de lignes de
`git diff --stat <SHA du commit de code> -- apps packages e2e` (attendu 0), à côté de ce qu'ils examinent (D290). Code de sortie 1 si l'un des deux n'est pas nul. Lecture seule. Archivé comme PIÈCE (D291), jamais promu en instrument."""
import subprocess
import sys
import time

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")


def git(*a: str) -> str:
    return subprocess.run(["git", *a], capture_output=True, encoding="utf-8", errors="replace").stdout


sha, moment = sys.argv[1], " ".join(sys.argv[2:]) or "(moment non dit)"
tete = git("rev-parse", "HEAD").strip()
arbre = git("rev-parse", "HEAD^{tree}").strip()
statut = [l for l in git("status", "--porcelain", "--untracked-files=all").splitlines() if l.strip()]
difference = [l for l in git("diff", "--stat", sha, "--", "apps", "packages", "e2e").splitlines() if l.strip()]
fichiers_code = [l for l in git("ls-tree", "-r", "--name-only", sha, "--", "apps", "packages", "e2e").splitlines() if l.strip()]
ok = not statut and not difference
print(f"[{time.strftime('%H:%M:%S')}] {moment}")
print(f"  HEAD {tete[:12]} · objet-arbre {arbre[:12]} · commit de code {sha[:12]}")
print(f"  git status : {len(statut)} ligne(s) (attendu 0)" + ("" if not statut else " : " + " | ".join(statut[:4])))
print(f"  git diff --stat {sha[:7]} -- apps packages e2e : {len(difference)} ligne(s) (attendu 0) ; {len(fichiers_code)} fichiers de code du commit de code examinés")
print("  " + ("✓ le même arbre" if ok else "✗ L'ARBRE A CHANGÉ"))
sys.exit(0 if ok else 1)
