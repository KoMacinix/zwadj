"""D315 — AUCUNE VALEUR DE COOKIE DE RAFRAÎCHISSEMENT D'UN JOURNAL HORS DÉPÔT N'A-T-ELLE ATTEINT CE QUI VA PARTIR ?
Jumeau de `docs/preuves/D299/outils/aucune-valeur-reelle.py` (non retouché), qui ne cherche que les jetons de vérification
d'e-mail. Pourquoi ce jumeau : l'audit de sécurité du 09/09 note que les journaux de l'API ne masquent pas le `Set-Cookie`
sortant (backlog, « audit sécu 09/09 · journaux ») ; les journaux de CE lot (sortie console des captures, journaux de l'API
de mesure — hors dépôt) portent donc des valeurs de `zwadj_rt`.
Usage, depuis la racine :  python docs/preuves/D315/controles/aucun-cookie-reel.py <journal>… -- <fichier|dossier>…
N'imprime JAMAIS une valeur : des comptes seulement. Codes : 0 = aucune ; 1 = au moins un porteur ; 2 = abandon.
Deux expressions qui doivent s'accorder (la seconde plus large) ; les valeurs vides (effacement du cookie) sont écartées.
Calibration à deux bras par journal, en mémoire : une pièce CONSTRUITE qui porte une valeur du journal est trouvée ; un
texte propre ne l'est pas. Abandon si un bras manque (D286).
"""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml") or "--" not in sys.argv:
    print("ABANDON : depuis la racine, usage <journal>… -- <fichier|dossier>…")
    sys.exit(2)
sep = sys.argv.index("--")
journaux, cibles = sys.argv[1:sep], sys.argv[sep + 1:]
NOM = "zwadj" + "_rt="  # assemblé : écrit d'un bloc, ce fichier ne se distingue pas d'un porteur au prochain audit
STRICT = re.compile(re.escape(NOM) + r"([A-Za-z0-9_\-.%]{16,})")
LARGE = re.compile(re.escape(NOM) + r"([^;\s\"'\\,]+)")
valeurs = set()
for j in journaux:
    t = open(j, "rb").read().decode("utf-8", errors="replace")
    s = {v for v in STRICT.findall(t)}
    l = {v for v in LARGE.findall(t) if v}
    print(f"{'✓' if s == l else '✗'} {os.path.basename(j)} : valeurs strictes {len(s)} · larges {len(l)} (doivent s'accorder)")
    if s != l:
        print("✗ ABANDON : une forme de valeur échappe à l'expression stricte")
        sys.exit(2)
    if s:
        v = sorted(s)[0]
        pos = f"entête\n{NOM}{v}; Path=/\n"
        neg = f"entête\n{NOM}; Max-Age=0\n"
        if not (v in pos and v not in neg and any(x in pos for x in s) and not any(x in neg for x in s)):
            print("✗ ABANDON : calibration manquée")
            sys.exit(2)
        print(f"  calibration : positif 1 (attendu 1) · négatif 0 (attendu 0)")
    valeurs |= s
fichiers = []
for c in cibles:
    if os.path.isdir(c):
        for r, _, ns in os.walk(c):
            fichiers += [os.path.join(r, n) for n in ns]
    else:
        fichiers.append(c)
porteurs, octets = 0, 0
for f in fichiers:
    b = open(f, "rb").read()
    octets += len(b)
    t = b.decode("utf-8", errors="replace")
    n = sum(t.count(v) for v in valeurs)
    if n:
        porteurs += 1
        print(f"✗ PORTEUR {f} : {n} occurrence(s)")
print(f"== valeurs cherchées : {len(valeurs)} ({len(journaux)} journal/journaux) · parcourus : {len(fichiers)} fichiers, "
      f"{octets} octets · porteurs : {porteurs} (attendu 0)")
sys.exit(1 if porteurs else 0)
