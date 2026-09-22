"""D300 — ce que le déplacement change à la DISTANCE entre le pointeur et la réponse (entrée `[DOC][P1]` du 11/09).
Usage, depuis la racine : python3 docs/preuves/D300/deplacement/distances.py
Mesure, par le TEXTE des titres (jamais par un numéro de ligne écrit d'avance) :
- AVANT, sur `git show HEAD:ZWADJ_CONTINUITE.md` (état de 0a8235d, avant ce lot) : ligne du titre de session que
  le pointeur désignait (« ## Session du 31/08/2026 — D270 »), ligne du sous-titre de l'ordre, ligne du rang
  courant — la DERNIÈRE ligne « ⇒ **RANG N » APRÈS le sous-titre (une autre ligne « RANG 20 » vit dans la
  clôture du rang 19 : la prendre ferait mesurer autre chose) ;
- APRÈS, sur l'arbre de travail : ligne du titre « ## ORDRE DES RANGS », ligne de la dernière « ⇒ **RANG N » de
  la section, fin de la section.
Imprime chaque repère avec le nombre de fois qu'il a été trouvé (attendu 1)."""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)
RANG = re.compile(r"^⇒ (?:~~)?\*\*RANG \d+")


def une(L, pred, libelle):
    n = [i + 1 for i, x in enumerate(L) if pred(x)]
    print(f"   {libelle} : trouvé {len(n)} fois (attendu 1) → ligne {n[0] if n else '—'}")
    if len(n) != 1:
        sys.exit(2)
    return n[0]


avant = subprocess.run(["git", "show", "HEAD:ZWADJ_CONTINUITE.md"], capture_output=True, check=True).stdout
# ⚠ le blob sort en LF (fins de ligne normalisées par git), l'arbre en CRLF : découper sur « \r\n » ne verrait
# qu'UNE ligne — relevé à la première exécution, qui a abandonné sur « trouvé 0 fois » (D290).
A = avant.decode("utf-8").splitlines()
# ⚠ l'attendu se compte sur l'octet 0x0A désigné par sa VALEUR : une première écriture en échappement, passée par
# l'outil d'édition, comptait la séquence littérale barre-oblique + n (8 occurrences) et imprimait « attendu 8 »
# à côté de 10 682 — vu parce que l'attendu s'imprime à côté du mesuré (D290), classe de D289.
FIN = bytes([10])
print(f"AVANT (HEAD) : {len(A)} lignes parcourues (attendu {avant.count(FIN)}, compté sur les octets)")
s = une(A, lambda x: x.startswith("## Session du 31/08/2026 — D270"), "titre de session désigné par le pointeur")
o = une(A, lambda x: x == "### D270 — ordre des lots, révisé par Ko", "sous-titre de l'ordre")
fin_o = next(i + 1 for i in range(o, len(A)) if A[i].startswith("#"))
r = max(i + 1 for i in range(o, fin_o - 1) if RANG.match(A[i]))
print(f"   dernière ligne « ⇒ RANG N » de l'ordre : ligne {r} · « {A[r - 1][:60]}… »")
print(f"   ⇒ pointeur → sous-titre {o - s} lignes · sous-titre → rang courant {r - o} · pointeur → rang courant {r - s}")
apres = open("ZWADJ_CONTINUITE.md", "rb").read()
N = apres.decode("utf-8").splitlines()
print(f"APRÈS (arbre de travail) : {len(N)} lignes parcourues (attendu {apres.count(FIN)}, compté sur les octets)")
if len(A) != avant.count(FIN) or len(N) != apres.count(FIN):
    print("✗ ÉCART AU PARCOURU — ne rien conclure")
    sys.exit(1)
t = une(N, lambda x: x == "## ORDRE DES RANGS — QUEL lot vient ensuite", "titre ## de l'ordre")
fin_t = next(i + 1 for i in range(t, len(N)) if N[i].startswith("## "))
r2 = max(i + 1 for i in range(t, fin_t - 1) if RANG.match(N[i]))
print(f"   dernière ligne « ⇒ RANG N » de la section : ligne {r2} · « {N[r2 - 1][:60]}… »")
print(f"   ⇒ titre → rang courant {r2 - t} lignes · section {fin_t - t} lignes · après le rang courant "
      f"{fin_t - r2 - 1} lignes · titre → point d'entrée suivant (fin de section) {fin_t - t}")
