#!/usr/bin/env python3
"""Recopie, DANS docs/preuves/D356/table-ouverture.md, les lignes citées depuis leurs fichiers sources (D356).

MODE D'EMPLOI : depuis la RACINE du dépôt, `python3 -I -X utf8 docs/preuves/D356/recopier-citations.py`.
POURQUOI : une citation recopiée à la main se corrompt (D289 : un texte qui traverse un interpréteur est du code qu'on lui donne ; D288 : le compte rendu d'un outil décrit ce qu'il a fait, pas ce que le
fichier contient). Ici, chaque marqueur `<<CIT:xxx>>` est remplacé par la ligne que le fichier source porte, cherchée par son DÉBUT ; le script ABANDONNE si le marqueur n'est pas là exactement une fois, si la
ligne n'est pas trouvée exactement une fois, ou si, APRÈS écriture, la ligne n'est pas retrouvée à l'identique dans le fichier cible (on relit le fichier, jamais le compte rendu).
Il compte ce qu'il a parcouru (D290). Les fins de ligne sont normalisées en LF pour la comparaison (les fichiers d'autorité sont en CRLF dans l'arbre de travail ; `docs/preuves/**` est en `-text`, en LF).
PIÈCE, jamais promue en instrument (copie adaptée de `docs/preuves/D355/recopier-citations.py`).
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

TABLE = "docs/preuves/D356/table-ouverture.md"
CONT = "ZWADJ_CONTINUITE.md"
CADRAGE = "docs/preuves/D340/cadrage.md"

# marqueur -> (fichier, début exact de la ligne cherchée)
CITATIONS = {
    "DR5-PIN": (CONT, "- PIN : 4 chiffres tirés par un générateur cryptographique"),
    "DR5-APPAREIL": (CONT, "- Le PIN ne vaut qu'avec le jeton d'APPAREIL"),
    "DR5-ESSAIS": (CONT, "- 3 essais : compteur ATOMIQUE en base"),
    "DR5-EXPIRATION": (CONT, "- Expiration : mot de passe 90 jours et PIN 90 jours"),
    # ⚠ Cette ligne figure DEUX fois dans le fichier (le bloc DR5 d'origine, et la recopie que la table de D355 en a faite) : l'ancre porte le NUMÉRO de la ligne d'origine (bloc DR1 à DR8), et le script abandonne si
    # une autre ligne la porte.
    "DR5-JOURNAL": (CONT, "- Journal : audit_logs.actor_member_id sur toute action de personnel", 2117),
    "R6-D341": (CONT, "- R-6. Avant qu'un PIN existe (ce lot), l'échéance d'un appareil est la durée du PIN"),
    "MP1": (CADRAGE, "| MP-1 |"),
    "MP2": (CADRAGE, "| MP-2 |"),
    "MP3": (CADRAGE, "| MP-3 |"),
    "MP10": (CADRAGE, "| MP-10 |"),
    "MP11": (CADRAGE, "| MP-11 |"),
    "MP12": (CADRAGE, "| MP-12 |"),
    "MP15": (CADRAGE, "| MP-15 |"),
    "MP26": (CADRAGE, "| MP-26 |"),
    "MP27": (CADRAGE, "| MP-27 |"),
    "MP28": (CADRAGE, "| MP-28 |"),
    "MP33": (CADRAGE, "| MP-33 |"),
    "MP36": (CADRAGE, "| MP-36 |"),
    "K14": (CADRAGE, "| **K-14** |"),
    "K15": (CADRAGE, "| **K-15** |"),
    "K18": (CADRAGE, "| **K-18** |"),
    "K23": (CADRAGE, "| **K-23** |"),
    "L363B": (CADRAGE, "| **L36-3b · « le PIN »**"),
    "LIM7": (CADRAGE, "7. **Une limite de débit par IP sur le PIN**"),
    "LIM8": (CADRAGE, "8. **Faire tourner le secret HMAC"),
    "S260": (CONT, "- **S-260** — **`quote.promote` n'écrit pas `actorMemberId`"),
}


def lire(chemin: str) -> str:
    return open(chemin, encoding="utf-8", newline="").read().replace("\r\n", "\n")


table = lire(TABLE)
sources = {}
parcourues = 0
for marqueur, (fichier, debut, *numero) in CITATIONS.items():
    if fichier not in sources:
        sources[fichier] = lire(fichier).split("\n")
    lignes = sources[fichier]
    parcourues += len(lignes)
    if numero:
        # ancre PAR NUMÉRO : la ligne doit commencer par `debut` ET se trouver au numéro dit (les autres lignes de même début sont comptées et dites)
        candidates = [(i + 1, l) for i, l in enumerate(lignes) if l.startswith(debut)]
        trouvees = [l for (n, l) in candidates if n == numero[0]]
        print(f"  {marqueur:14s} : {len(candidates)} ligne(s) commencent par le même début (numéros {[n for n, _ in candidates]}) ; retenue : la ligne {numero[0]}")
    else:
        trouvees = [l for l in lignes if l.startswith(debut)]
    if len(trouvees) != 1:
        print(f"✗ ABANDON : {marqueur} — {len(trouvees)} ligne(s) de {fichier} commencent par {debut!r} (attendu exactement 1) ; {len(lignes)} lignes parcourues")
        sys.exit(2)
    jeton = f"<<CIT:{marqueur}>>"
    if table.count(jeton) != 1:
        print(f"✗ ABANDON : le marqueur {jeton} figure {table.count(jeton)} fois dans la table (attendu exactement 1)")
        sys.exit(2)
    table = table.replace(jeton, trouvees[0])
    print(f"  {marqueur:14s} ← {fichier} ({len(lignes)} lignes parcourues) : {len(trouvees[0])} caractères recopiés")

if re.search(r"<<CIT:[A-Z0-9-]+>>", table):
    print("✗ ABANDON : un marqueur reste dans la table après remplacement")
    sys.exit(2)

open(TABLE, "w", encoding="utf-8", newline="").write(table)

# on RELIT le fichier écrit (jamais le compte rendu de l'écriture) : chaque ligne citée doit s'y trouver à l'identique ET dans sa source
relu = lire(TABLE)
echecs = 0
for marqueur, (fichier, debut, *numero) in CITATIONS.items():
    ligne = (sources[fichier][numero[0] - 1] if numero else [l for l in sources[fichier] if l.startswith(debut)][0])
    dans_table = relu.count("\n" + ligne + "\n")
    if dans_table != 1:
        print(f"  ✗ contrôle {marqueur} : la ligne figure {dans_table} fois dans la table (attendu 1)")
    echecs += dans_table != 1
print(f"{'ÉCHEC DU CONTRÔLE' if echecs else 'OK'} — {len(CITATIONS)} citations recopiées et relues ; {parcourues} lignes de sources parcourues ; lignes de la table parcourues : {relu.count(chr(10)) + 1} ; attendu 0 échec, mesuré {echecs}")
sys.exit(1 if echecs else 0)
