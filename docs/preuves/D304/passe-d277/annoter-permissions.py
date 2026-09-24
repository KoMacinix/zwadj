"""D304 — passe D277, sens 2 : annote les « un lot de code peut s'ouvrir dès que Ko l'arbitre » /
« dès l'arbitrage » COURANTS de ZWADJ_CONTINUITE.md (hors sections datées « ## Session » et
« ## Incident », hors texte barré). Motif : Ko a arbitré 23a le 24/09/2026 ; lue seule, la phrase
laisserait croire que 23a peut s'ouvrir — or sur le chemin de l'argent le relecteur décide d'abord
sur le cadrage (D302, étendu par D303, décision 1).

Depuis la racine :  python3 docs/preuves/D304/passe-d277/annoter-permissions.py [--ecrire]

⚠ D289 : le texte inséré est LU dans `annotation-permissions.txt`, il ne traverse aucun
interpréteur. ⚠ Octets : le fichier est en CRLF ; on découpe sur b"\r\n" et on recolle pareil.
⚠ Imprime les lignes parcourues, les occurrences vues, celles retenues, et l'attendu (D290).
Sans --ecrire : relevé seul, rien n'est écrit.
"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
F = "ZWADJ_CONTINUITE.md"
ANNOT = open("docs/preuves/D304/passe-d277/annotation-permissions.txt", encoding="utf-8").read().rstrip("\r\n")
assert "D304" in ANNOT and "\n" not in ANNOT
RX = re.compile(r"(peut\**\s+s'ouvrir dès (?:que Ko l'arbitre|l'arbitrage(?: de Ko)?))")
ATTENDU = 17  # relevé à la main : 18 courantes, dont UNE barrée sur deux lignes (l. 1144)
# ⛔ PREMIÈRE PASSE (relevé seul, rien écrit), À MON COMPTE : attendu écrit 16 — j'avais compté
# 17 courantes au lieu de 18 — ET l'heuristique « barré » ne regardait que la LIGNE : elle
# excluait la l. 1956, dont le `~~` suivant barre la phrase d'APRÈS. Les deux erreurs se
# compensaient pile : « retenues : 16 (attendu 16) ». Vu en confrontant la liste imprimée à la
# liste précédente, pas par le compte. ⇒ Le barré se compte depuis le DÉBUT DU PARAGRAPHE.

brut = open(F, "rb").read()
assert brut.count(b"\n") == brut.count(b"\r\n"), "fins de ligne mixtes"
lignes = brut.decode("utf-8").split("\r\n")
section, vues, retenues, debut_para = "", 0, [], 0
for i, l in enumerate(lignes):
    if l.startswith("## "):
        section = l
    if not l.strip():
        debut_para = i + 1
    for m in RX.finditer(l):
        vues += 1
        datee = section.startswith("## Session") or section.startswith("## Incident")
        avant = "\n".join(lignes[debut_para:i]) + "\n" + l[:m.start()]
        barre = avant.count("~~") % 2 == 1
        deja = ANNOT.strip() in l
        if datee or barre or deja:
            continue
        retenues.append((i, m))
print(f"lignes parcourues : {len(lignes)} · occurrences vues : {vues} · retenues : {len(retenues)} (attendu {ATTENDU})")
for i, m in retenues:
    print(f"  l. {i + 1} : …{lignes[i][max(0, m.start() - 40):m.end() + 30]}…")
if len(retenues) != ATTENDU:
    sys.exit("ABANDON : le compte retenu n'est pas l'attendu")
if "--ecrire" in sys.argv:
    for i, m in reversed(retenues):
        l = lignes[i]
        lignes[i] = l[:m.end()] + ANNOT + l[m.end():]
    open(F, "wb").write("\r\n".join(lignes).encode("utf-8"))
    relu = open(F, encoding="utf-8").read()
    print(f"écrit · annotations présentes après écriture : {relu.count(ANNOT.strip())} (attendu {ATTENDU})")
