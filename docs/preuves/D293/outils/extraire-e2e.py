"""Extrait DERIVE du journal e2e — parce que le journal BRUT ne peut pas entrer au depot (D293, 16/09/2026).

Usage, depuis la racine : python docs/preuves/D293/outils/extraire-e2e.py SOURCE DESTINATION

POURQUOI : l'audit de secrets a releve **24 jetons de verification d'e-mail** (43 caracteres) dans
`rang15-e2e.log` — le serveur de developpement imprime les liens de verification, faute de mailer en dev.
⛔ Une preuve NE SE RETOUCHE PAS (D291) : on ne caviarde donc pas le journal, **on ne le verse pas**, et on
verse a la place un EXTRAIT, nomme comme tel, qui ne garde que les lignes de VERDICT.
⚠ Un extrait n'est pas la piece : il est DERIVE, et la section qui le cite doit le dire.

FORME : liste blanche, jamais liste noire — on ne garde QUE les lignes qui matchent le verdict Playwright
(`N passed`, `N skipped`, `N failed`, `N flaky`, `Running N tests`). Une liste noire (« retirer ce qui
contient token= ») laisserait passer tout ce qu'on n'a pas prevu.
CONTROLE, imprime : lignes parcourues, lignes gardees, et occurrences de « token= » dans la sortie
(attendu 0) — ABANDON si ce n'est pas 0.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if len(sys.argv) != 3:
    sys.exit("ABANDON : usage SOURCE DESTINATION")
src, dst = sys.argv[1], sys.argv[2]
GARDE = re.compile(r"^\s*(\d+\s+(passed|skipped|failed|flaky)|Running\s+\d+\s+test)", re.IGNORECASE)

lignes = open(src, "rb").read().decode("utf-8", errors="replace").split("\n")
gardees = [l.rstrip("\r") for l in lignes if GARDE.match(l.strip())]
sortie = ("EXTRAIT DERIVE de " + src.replace("\\", "/") + " — PAS la piece brute.\n"
          "Le journal brut n'entre pas au depot : il porte 24 jetons de verification d'e-mail imprimes\n"
          "par le serveur de developpement (audit de secrets du 16/09/2026). Il reste hors depot, et une\n"
          "preuve ne se retouche pas : ceci est un EXTRAIT par liste blanche des lignes de verdict.\n"
          "lignes parcourues : " + str(len(lignes)) + " · lignes gardees : " + str(len(gardees)) + "\n"
          "--- verdict ---\n" + "\n".join(gardees) + "\n")
jetons = sortie.count("token=")
print(f"lignes parcourues : {len(lignes)} · gardees : {len(gardees)} · « token= » dans la sortie : {jetons} (attendu 0)")
if jetons:
    sys.exit("ABANDON : la sortie porte encore des jetons")
open(dst, "w", encoding="utf-8", newline="\n").write(sortie)
print("ecrit : " + dst.replace("\\", "/"))
