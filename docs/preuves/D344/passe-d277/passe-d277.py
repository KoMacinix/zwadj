#!/usr/bin/env python3
"""D344 — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que ce lot INVALIDE. Sens 2 (D287) : les PERMISSIONS dont la condition vient de changer.
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275 : jamais un compte sans son contexte).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture (D286 : deux bras, ABANDON si un cas manque son verdict).
Usage : python3 docs/preuves/D344/passe-d277/passe-d277.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D344 : jouée UNE fois AVANT les écritures de clôture (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt).
Instrument d'origine : docs/preuves/D343/passe-d277/passe-d277.py (même squelette ; motifs propres à ce lot). Recherche INSENSIBLE À LA CASSE.
Archivé comme PREUVE (D291), jamais promu en instrument.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
TEXTE = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in FICHIERS}

SENS1 = [
    ("« RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR » (le rang 46 est CLOS par D344)", r"RANG 46 : EN ATTENTE DE CADRAGE"),
    ("« compteur POUR MÉMOIRE DIX-NEUF » (DIX-NEUF → VINGT à la clôture de D344)", r"POUR MÉMOIRE (?:\*\*)?DIX-NEUF"),
    ("« HORS DE LA SUITE » (la spec du lien, r30, y est revenue ; r32 reste dehors)", r"HORS DE LA SUITE"),
    ("« reste hors de la suite » / « sortie de la suite » pour la spec du lien (r30)", r"(?:reste|restent) hors de la suite|sortie(?:s)? de la suite"),
    ("« NE SE REJOUE QUE COPIÉE DANS e2e/specs » / « AUCUNE CONFIGURATION DE REJEU » (r30 est DANS la suite)", r"NE SE REJOUE QUE COPI|AUCUNE CONFIGURATION DE REJEU"),
    ("« le retour de chacune est un lot que Ko ordonne » / « un déplacement de fichier » (r30 est revenue ; r32 est arrêtée, ce n'est PAS un déplacement)", r"la remettre = un déplacement de fichier|retour de chacune est un lot|retour de la spec est un déplacement"),
    ("« la suite … 78 tests » (79 avec r30)", r"78 (?:attendus|tests)|77 passés \+ 1 ignoré"),
    ("« une garde permanente / la spec du rang 32 … HORS » (r32 : ni revenue ni sortie de la liste des reports)", r"spec e2e du rang 32 est HORS"),
]
SENS2 = [
    ("PERMISSION « peuvent revenir » / « peut revenir » (la condition change : r30 est revenue, r32 est arrêtée par R-3)", r"PEUVENT REVENIR|peut revenir"),
    ("PERMISSION « un lot de code PEUT s'ouvrir » / « candidat … L36-3a-2 » (le rang 47 s'écrit à la clôture)", r"L36-3a-2"),
    ("PERMISSION « ce lot passe avant L36-3a-2 » / « avant L36-4 » (R-1 de D344 : consommée par la clôture)", r"passe avant L36-3a-2|filet e2e complet doit être en place"),
]

CALIB_POS = ("RANG 45 : CLOS", r"RANG 45 : CLOS")
CALIB_NEG = ("motif fabriqué", r"ZZ_D344_INEXISTANT_ZZ")


def compter(motif):
    return {f: len(re.findall(motif, t, flags=re.I)) for f, t in TEXTE.items()}


def contextes(motif, n=70):
    sortie = []
    for f, t in TEXTE.items():
        for m in re.finditer(motif, t, flags=re.I):
            sortie.append(f"   [{f}] …{t[max(0, m.start() - n):m.start()]}«{m.group(0)}»{t[m.end():m.end() + n]}…")
    return sortie


def main():
    out = []
    pos, neg = compter(CALIB_POS[1]), compter(CALIB_NEG[1])
    if sum(pos.values()) == 0 or sum(neg.values()) != 0:
        print("✗ CALIBRATION MANQUÉE — la passe ne juge pas", pos, neg)
        sys.exit(2)
    out.append(f"calibration : positif « {CALIB_POS[0]} » {sum(pos.values())} (attendu > 0) · négatif « {CALIB_NEG[0]} » {sum(neg.values())} (attendu 0)")
    out.append("fichiers parcourus (aplatis) : " + " · ".join(f"{f} {len(t)} car." for f, t in TEXTE.items()))
    for titre, groupe in (("SENS 1 — ce que le lot INVALIDE", SENS1), ("SENS 2 — ce que le lot REND PERMIS ou ne permet plus (D287)", SENS2)):
        out.append("")
        out.append(f"=== {titre} ===")
        for libelle, motif in groupe:
            c = compter(motif)
            out.append(f"\n● {libelle}\n  motif : {motif}\n  occurrences : {sum(c.values())} ({', '.join(f'{f.split('.')[0]} {n}' for f, n in c.items())})")
            if sum(c.values()) == 0:
                out.append("  ⚠ ZÉRO : une hypothèse à vérifier, pas une absence constatée (D295)")
            out.extend(contextes(motif))
    texte = "\n".join(out) + "\n"
    with open(sys.argv[1], "w", encoding="utf-8", newline="\n") as f:
        f.write(texte)
    print(texte[:600])


if __name__ == "__main__":
    main()
