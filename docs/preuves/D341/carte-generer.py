"""Génère `docs/preuves/D341/carte-modes-de-defaillance.md` : la carte des modes de défaillance MP-1 à MP-44 du cadrage de D340 (§ 4) vers leur(s) TEST(s) et leur(s) CIBLE(s) de `neutralize-r44.py`.
Un mode absent du § 4 ne s'y trouve pas (D126). La carte est DÉRIVÉE (les tests et les cibles sont relevés dans les fichiers, jamais recopiés à la main) ; elle imprime ce qu'elle a parcouru (D290).
Calibration, deux bras : (positif) MP-22 figure dans le test d'activation ET dans une cible ; (négatif) un mode fabriqué MP-999 ne figure nulle part.
Usage, depuis la RACINE : python3 generer-carte.py > docs/preuves/D341/carte-modes-de-defaillance.md"""
import glob
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

CADRAGE = "docs/preuves/D340/cadrage.md"
HARNAIS = "neutralisation/neutralize-r44.py"
TESTS = sorted(
    set(glob.glob("apps/api/src/staff/*.spec.ts") + glob.glob("apps/api/src/common/staff-*.spec.ts") + glob.glob("apps/api/test/int/staff-*") + glob.glob("apps/api/test/int/log-*")
        + ["apps/api/test/int/throttle.int-spec.ts", "apps/api/test/int/migration-non-empty.int-spec.ts", "packages/api-client/src/staff-client.test.ts"])
)

LIGNE = re.compile(r"^\| (MP-\d+) \| (.*?) \| (.*?) \| (.*?) \| (.*?) \| ([^|]*?) \|\s*$")
modes = []
for l in open(CADRAGE, encoding="utf-8").read().splitlines():
    m = LIGNE.match(l)
    if m:
        modes.append(m.groups())


def mentions(texte: str, mp: str) -> int:
    return len(re.findall(rf"{re.escape(mp)}(?!\d)", texte))


contenus = {f: open(f, encoding="utf-8", newline="").read() for f in TESTS}
harnais = open(HARNAIS, encoding="utf-8", newline="").read()
cibles = [l for l in harnais.splitlines() if l.startswith("cible(")]


def tests_de(mp: str) -> list[tuple[str, int]]:
    return [(f.replace("apps/api/", "").replace("packages/", ""), mentions(c, mp)) for f, c in contenus.items() if mentions(c, mp) > 0]


def cibles_de(mp: str) -> list[str]:
    return [re.match(r'cible\("([A-Z]-\d+)\.', l).group(1) for l in cibles if mentions(l, mp) > 0]


# calibration
assert tests_de("MP-22") and cibles_de("MP-22"), "calibration positive : MP-22 devrait figurer dans un test et dans une cible"
assert not tests_de("MP-999") and not cibles_de("MP-999"), "calibration négative : MP-999 ne devrait figurer nulle part"

print("# D341 — carte des modes de défaillance du lot L36-3a-1 (MP-1 à MP-44 du cadrage de D340, § 4) → tests → cibles de `neutralize-r44.py`")
print()
print("Pièce DÉRIVÉE par un script qui lit les fichiers (aucun test, aucune cible n'est recopié à la main) : `generer-carte.py` (archivé avec la section D341 ; calibré à deux bras). **Un mode absent du § 4 ne s'y trouve pas** (D126). Les colonnes « tests » et « cibles » comptent les MENTIONS du numéro de mode dans les fichiers de test et les libellés de cible ; une mention n'est pas une preuve — la preuve est la morsure de la cible (journaux de la campagne), jamais cette carte.")
print()
print("| mode | ce qu'il redoute (cadrage) | lot | tests qui le nomment (mentions) | cibles r44 | lecture |")
print("|---|---|---|---|---|---|")
dans_le_lot = sans_test = sans_cible = 0
for mp, mode, garde, base, mesure, lot in modes:
    lot = lot.strip()
    t, c = tests_de(mp), cibles_de(mp)
    portee = "1" in lot.replace(" ", "").split("·")
    if portee:
        dans_le_lot += 1
        sans_test += not t
        sans_cible += not c
        lecture = "dans le lot · " + ("testé" if t else "**AUCUN TEST NE LE NOMME**") + " · " + ("neutralisé" if c else "**AUCUNE CIBLE NE LE NOMME**")
    else:
        lecture = "hors lot (lot " + lot + ")" + (" — nommé tout de même par un test" if t else "")
    ts = ", ".join(f"`{f}` ×{n}" for f, n in t) or "—"
    cs = ", ".join(c) or "—"
    print(f"| {mp} | {mode.replace('|', '/')[:150]} | {lot} | {ts} | {cs} | {lecture} |")
print()
print(f"**Parcouru** : {len(modes)} modes lus dans le § 4 (attendu 44) · {len(TESTS)} fichiers de test · {len(cibles)} cibles ; **dans le lot** : {dans_le_lot} · sans test qui les nomme : {sans_test} · sans cible qui les nomme : {sans_cible}.")
print()
print("**MP-42 n'a ni test ni cible, et c'est dit** : c'est un geste INTERDIT (`prisma migrate dev`), pas un comportement du code ; il est tenu par une PIÈCE — la sonde de dérive de D334 rejouée sans modification, `derive-prisma.txt` — et par l'interdit écrit dans `AGENTS.md`. Aucun test ne peut empêcher une commande qu'un humain tape.")
if len(modes) != 44:
    sys.exit("✗ le nombre de modes lus n'est pas 44 : le motif ne lit plus la table")
