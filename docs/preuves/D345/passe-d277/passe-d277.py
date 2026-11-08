#!/usr/bin/env python3
"""D345 — LA PASSE D277 DES DEUX SENS (AGENTS.md : D277, D287). Cherche, dans les TROIS fichiers d'autorité, sur le texte APLATI (les lignes y sont coupées à ~95 colonnes),
(A) les affirmations que le lot INVALIDE et (B) les PERMISSIONS dont la condition vient de changer. Imprime, pour chaque fichier, le NOMBRE DE CARACTÈRES examinés et, pour chaque
motif, son compte — y compris les motifs à zéro, nommés (D290, D295) ; le détail de chaque occurrence est lu et trié à la main dans `passe-d277.md`.
Usage : python3 -I docs/preuves/D345/passe-d277/passe-d277.py [avant|apres]   (depuis la RACINE)
CALIBRATION (D286) : un motif est calibré sur un texte fabriqué qui le contient (doit rendre 1) et sur un texte qui ne le contient pas (doit rendre 0) ; ABANDON si un cas manque."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
MOTIFS = [
    ("A1 « RANG 47 : EN ATTENTE DE CADRAGE »", r"RANG 47 : EN ATTENTE DE CADRAGE"),
    ("A2 compteur POUR MÉMOIRE VINGT (état courant)", r"POUR MÉMOIRE \*{0,2}VINGT\*{0,2}(?! ET UN)"),
    ("A3 « dernier numéro attribué : D344 »", r"dernier numéro attribué : \*\*D344\*\*"),
    ("A4 « D344 est au registre »", r"D344 est au registre"),
    ("A5 libellé « Annuler » du bouton de remise à zéro du parcours", r"« Annuler » (?:remet|puis un NOUVEAU|\(la remise à zéro\))"),
    ("A6 le parcours « perd son état » / « revient à la première question » au changement d'onglet", r"perd son état|aller à .Demandes. puis revenir"),
    ("B1 « un lot de code PEUT s'ouvrir »", r"un lot de code PEUT s'ouvrir"),
    ("B2 « aucun lot de code ne s'ouvre »", r"aucun lot de code ne s'ouvre"),
    ("B3 candidat L36-3a-2 pour le rang 47", r"RANG 47[^.]{0,200}L36-3a-2"),
    ("B4 « le rang 47 reste à cadrer » / « en attente de cadrage du relecteur » (rang 47)", r"rang 47, à cadrer|le rang 47 n'est \*\*pas\*\* nommé"),
]
CAS = {"A1 « RANG 47 : EN ATTENTE DE CADRAGE »": ("x RANG 47 : EN ATTENTE DE CADRAGE y", "RANG 48 : EN ATTENTE DE CADRAGE"),
       "B1 « un lot de code PEUT s'ouvrir »": ("un lot de code PEUT s'ouvrir dès", "un lot de code s'ouvre")}


def calibrer() -> bool:
    ok = True
    for nom, motif in MOTIFS:
        if nom in CAS:
            pos, neg = CAS[nom]
            a, b = len(re.findall(motif, pos)), len(re.findall(motif, neg))
            print(f"  calibration {'✓' if (a, b) == (1, 0) else '✗'} {nom} : positif {a} (attendu 1) · négatif {b} (attendu 0)")
            ok &= (a, b) == (1, 0)
    return ok


def main() -> int:
    moment = sys.argv[1] if len(sys.argv) > 1 else "avant"
    print(f"D345 — passe D277 « {moment} »")
    if not calibrer():
        print("ABANDON : calibration manquée")
        return 2
    total = {}
    for f in FICHIERS:
        t = re.sub(r"\s+", " ", open(f, encoding="utf-8").read())
        print(f"== {f} : {len(t)} caractères examinés (texte aplati)")
        for nom, motif in MOTIFS:
            n = len(re.findall(motif, t))
            total[nom] = total.get(nom, 0) + n
            print(f"   {n:4d}  {nom}" + ("   ← motif à ZÉRO : une hypothèse à vérifier, pas une absence constatée" if n == 0 else ""))
    print("== total par motif")
    for nom, n in total.items():
        print(f"   {n:4d}  {nom}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
