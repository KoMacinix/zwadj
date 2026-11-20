#!/usr/bin/env python3
"""Recopie, DANS docs/preuves/D355/table-ouverture.md, les lignes citées depuis leurs fichiers sources (D355).

MODE D'EMPLOI : depuis la RACINE du dépôt, `python3 -I -X utf8 recopier-citations.py`.
POURQUOI : une citation recopiée à la main se corrompt (D289 : un texte qui traverse un interpréteur est du code qu'on lui donne ; D288 : le compte rendu d'un outil décrit ce qu'il a fait, pas ce que le
fichier contient). Ici, chaque marqueur `<<CIT:xxx>>` est remplacé par la ligne que le fichier source porte, cherchée par son DÉBUT ; le script ABANDONNE si le marqueur n'est pas là exactement une fois, si la
ligne n'est pas trouvée exactement une fois, ou si, APRÈS écriture, la ligne n'est pas retrouvée à l'identique dans le fichier cible (on relit le fichier, jamais le compte rendu).
Il compte ce qu'il a parcouru (D290). Les fins de ligne sont normalisées en LF pour la comparaison (les fichiers d'autorité sont en CRLF dans l'arbre de travail ; `docs/preuves/**` est en `-text`, en LF).
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

TABLE = "docs/preuves/D355/table-ouverture.md"
CONT = "ZWADJ_CONTINUITE.md"
CADRAGE = "docs/preuves/D340/cadrage.md"

# marqueur -> (fichier, début exact de la ligne cherchée)
CITATIONS = {
    "DR5": (CONT, "- Journal : audit_logs.actor_member_id sur toute action de personnel"),
    "R8": (CONT, "- R-8. L'audit « création et modification de fiche » (DR5) et S-107 appartiennent à L36-3a-2"),
    "MP33": (CADRAGE, "| MP-33 |"),
    "C55": (CADRAGE, "| 2 | `apps/api/src/clients/pro-clients.service.ts` |"),
    "C94": (CADRAGE, "4. **L'audit « création et modification de fiche »**"),
    "S248": (CONT, "- **S-248** — **Le défaut croisé « connexion ‖ réinitialisation » est MESURÉ"),
}


def lire(chemin: str) -> str:
    return open(chemin, encoding="utf-8", newline="").read().replace("\r\n", "\n")


table = lire(TABLE)
sources = {}
parcourues = 0
for marqueur, (fichier, debut) in CITATIONS.items():
    if fichier not in sources:
        sources[fichier] = lire(fichier).split("\n")
    lignes = sources[fichier]
    parcourues += len(lignes)
    trouvees = [l for l in lignes if l.startswith(debut)]
    if len(trouvees) != 1:
        print(f"✗ ABANDON : {marqueur} — {len(trouvees)} ligne(s) de {fichier} commencent par {debut!r} (attendu exactement 1) ; {len(lignes)} lignes parcourues")
        sys.exit(2)
    jeton = f"<<CIT:{marqueur}>>"
    if table.count(jeton) != 1:
        print(f"✗ ABANDON : le marqueur {jeton} figure {table.count(jeton)} fois dans la table (attendu exactement 1)")
        sys.exit(2)
    table = table.replace(jeton, trouvees[0])
    print(f"  {marqueur:5s} ← {fichier} ({len(lignes)} lignes parcourues) : {len(trouvees[0])} caractères recopiés")

if re.search(r"<<CIT:[A-Z0-9]+>>", table):
    print("✗ ABANDON : un marqueur reste dans la table après remplacement")
    sys.exit(2)

open(TABLE, "w", encoding="utf-8", newline="").write(table)

# on RELIT le fichier écrit (jamais le compte rendu de l'écriture) : chaque ligne citée doit s'y trouver à l'identique ET dans sa source
relu = lire(TABLE)
echecs = 0
for marqueur, (fichier, debut) in CITATIONS.items():
    ligne = [l for l in sources[fichier] if l.startswith(debut)][0]
    dans_table = relu.count("\n" + ligne + "\n")
    print(f"  contrôle {marqueur:5s} : la ligne figure {dans_table} fois dans la table (attendu 1) ; lignes parcourues dans la table : {relu.count(chr(10)) + 1}")
    echecs += dans_table != 1
print("ÉCHEC DU CONTRÔLE" if echecs else f"OK — {len(CITATIONS)} citations recopiées et relues ; {parcourues} lignes de sources parcourues ; attendu 0 échec, mesuré {echecs}")
sys.exit(1 if echecs else 0)
