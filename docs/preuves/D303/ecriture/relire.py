"""Relecture de D302 (D289 : on relit ce qu'on a écrit DANS LE FICHIER, jamais le compte rendu de l'outil).
Usage, depuis la racine : python3 docs/preuves/D302/ecriture/relire.py <fichier-de-jetons>
Fichier de jetons (lu dans un FICHIER, D289) : une ligne = <fichier cible> TAB <attendu> TAB <jeton> ; « # » = commentaire.
Le jeton se cherche sur le texte APLATI (D294 : ces fichiers sont enveloppés, une expression y est coupée) —
blancs réduits à une espace, `*`, accents graves et « > » de début de ligne retirés, comme le balayage de D300.
Imprime, pour chaque jeton, le compté À CÔTÉ de l'attendu (D290), et le parcouru : fichiers, caractères, jetons.
CALIBRATION, deux bras, avant tout comptage : un témoin où le jeton est coupé par un CRLF, en gras et derrière « > »
⇒ 1 ; le même témoin altéré d'un caractère ⇒ 0. Un bras manqué ⇒ ABANDON."""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)


def aplatir(t):
    t = re.sub(r"(?m)^>[ ]?", "", t.replace("\r\n", "\n"))
    t = t.replace("*", "").replace("`", "")
    return re.sub(r"\s+", " ", t)


temoin = "> le **RANG 22**\r\n> est D302\r\n"
pos = aplatir(temoin).count("le RANG 22 est D302")
neg = aplatir(temoin.replace("D302", "D303")).count("le RANG 22 est D302")
print(f"CALIBRATION : bras positif {pos} (attendu 1) · bras négatif {neg} (attendu 0)")
if (pos, neg) != (1, 0):
    print("✗ ABANDON"); sys.exit(2)

cache, ok, n = {}, True, 0
for ligne in open(sys.argv[1], encoding="utf-8"):
    ligne = ligne.rstrip("\r\n")
    if not ligne or ligne.startswith("#"):
        continue
    f, attendu, jeton = ligne.split("\t", 2)
    if f not in cache:
        cache[f] = aplatir(open(f, encoding="utf-8").read())
    compte = cache[f].count(jeton)
    n += 1
    bon = compte == int(attendu)
    ok &= bon
    print(f"   {'✓' if bon else '✗'} {f} : {compte} (attendu {attendu}) · « {jeton} »")
print(f"== parcourus : {len(cache)} fichiers · {sum(len(v) for v in cache.values())} caractères aplatis · {n} jetons · "
      f"{'TOUS AU COMPTE' if ok else 'ÉCART — ne rien conclure'}")
sys.exit(0 if ok else 1)
