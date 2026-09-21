"""Chaque permission « courante » de ZWADJ_CONTINUITE.md est-elle TRAITÉE après D298 ? (D277, sens 2)
Usage, depuis la racine : python3 docs/preuves/D298/passe-d277/permissions-traitees.py
Pour chaque permission de zone courante (mêmes motif et zones que permissions.py, dont il reprend le
code), la fenêtre va de la permission à la permission SUIVANTE (ou 900 caractères) ; elle est traitée si
elle porte une annotation D298, ou « permission consommée » (format de D291 — la levée qui suit est
alors elle-même une permission, vérifiée à son tour), ou si la permission est barrée (« ~~ » ouvert
avant elle) ou négative (« ne peut »).
⚠ PREMIÈRE VERSION FAUSSE, GARDÉE EN MÉMOIRE ICI : elle retrouvait chaque occurrence par un extrait de
TEXTE — or la même phrase figure mot pour mot aux deux sites de l'ordre des rangs, et `find()` rendait
le premier pour les deux : « non traitée » sur une permission annotée. Les occurrences se repèrent
désormais par leur POSITION."""
import bisect
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
# Bras NÉGATIF de la calibration : passer en argument la version d'AVANT D298 (`git show HEAD:…`) —
# les huit permissions annotées par D298 doivent y ressortir NON traitées, et elles seules.
brut = open(sys.argv[1] if len(sys.argv) > 1 else "ZWADJ_CONTINUITE.md", encoding="utf-8").read()
lignes = brut.split("\n")
debuts = [0]
for l in lignes[:-1]:
    debuts.append(debuts[-1] + len(l) + 1)
titres = [(i + 1, l) for i, l in enumerate(lignes) if l.startswith("## ")]
ordre = [i + 1 for i, l in enumerate(lignes) if l.startswith("### D270 — ordre des lots")]
fin_ordre = [i + 1 for i, l in enumerate(lignes) if l.startswith("### ") and ordre and i + 1 > ordre[0]]
if not (ordre and fin_ordre):
    sys.exit("ABANDON : la section de l'ordre des rangs n'est pas repérée")


def zone(no: int) -> str:
    if ordre[0] <= no < fin_ordre[0]:
        return "courante"
    avant = [t for n, t in titres if n <= no]
    return "datée" if avant and (avant[-1].startswith("## Session") or avant[-1].startswith("## Incident")) else "courante"


plat, carte, blanc = [], [], False
for i, c in enumerate(brut):
    if c.isspace():
        if not blanc:
            plat.append(" "); carte.append(i)
        blanc = True
    else:
        plat.append(c); carte.append(i); blanc = False
plat = "".join(plat)
RX = re.compile(r"(?i)\*{0,2}peu(?:t|vent)\*{0,2} (?:désormais |donc )?s'ouvrir")
toutes = [m.start() for m in RX.finditer(plat)]
examinees = non = 0
for k, p in enumerate(toutes):
    no = bisect.bisect_right(debuts, carte[p])
    if zone(no) != "courante":
        continue
    examinees += 1
    fin = min(p + 900, toutes[k + 1] if k + 1 < len(toutes) else len(plat))
    fenetre = plat[p:fin]
    barre = plat[:p].count("~~") % 2 == 1
    negatif = bool(re.search(r"(?i)ne \*{0,2}$", plat[max(0, p - 6):p]))
    annote = "(D298" in fenetre
    consommee = bool(re.search(r"(?i)permission consommée", fenetre))
    ok = barre or negatif or annote or consommee
    non += not ok
    verdict = ("barrée" if barre else "négative" if negatif else "annotée D298" if annote
               else "consommée (D291), la levée suivante est vérifiée à son tour" if consommee else "NON TRAITÉE")
    print(f"  {'✓' if ok else '✗'} l.{no} : {verdict}")
print(f"== permissions parcourues : {len(toutes)} · courantes examinées : {examinees} (attendu 13, sortie de "
      f"permissions.py) · non traitées : {non} (attendu 0)")
sys.exit(1 if non or examinees != 13 else 0)
