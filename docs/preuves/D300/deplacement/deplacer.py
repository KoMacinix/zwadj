"""D300 — rang 20 : l'ORDRE DES RANGS sort de la section D270 et reçoit son propre titre `##`.
Usage, depuis la racine, UNE fois : python3 docs/preuves/D300/deplacement/deplacer.py
Ce que fait le script, et rien d'autre, dans `ZWADJ_CONTINUITE.md` :
1. repère, par leur TEXTE (jamais par un numéro de ligne), le sous-titre « ### D270 — ordre des lots, révisé par
   Ko » et le titre qui le suit — il DOIT être « ### D271 — ⚠ DEUX BRANCHES EMPILÉES », sans titre entre les deux ;
2. prend le CORPS entre les deux (blancs de bord exceptés) et le pose, TEL QUEL, sous le titre et l'introduction
   lus dans `entete-ordre.md`, juste avant le premier point d'entrée « ## …PROCHAIN LOT… » ;
3. laisse le sous-titre à sa place, suivi du renvoi daté lu dans `renvoi-D270.md` (contrainte de Ko : la section
   D270 est datée et ne se réécrit pas, D291).
Les textes insérés sont lus dans des FICHIERS — aucun ne traverse une couche qui l'interpole (D289).
ABANDON, sans rien écrire, si : un LF nu ou un CR seul est présent (le fichier est en CRLF pur) ; un repère est
trouvé ≠ 1 fois ; le titre suivant n'est pas celui de D271.
Après écriture, RELIT LE FICHIER (jamais son propre compte rendu, D289) et vérifie : empreinte SHA-256 du corps
à la nouvelle place = celle d'avant ; bilan de lignes = attendu ; NON-PERTE — toute ligne de l'ancien fichier
est dans le nouveau, et le nouveau n'a en plus QUE les lignes insérées ; renvoi en place ; 0 LF nu. Chaque
contrôle s'imprime avec son attendu à côté (D290)."""
import collections
import hashlib
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)
F = "ZWADJ_CONTINUITE.md"
D = "docs/preuves/D300/deplacement/"
SOUS_TITRE = "### D270 — ordre des lots, révisé par Ko".encode()
SUIVANT = "### D271 — ⚠ DEUX BRANCHES EMPILÉES".encode()
ANCRE = "PROCHAIN LOT".encode()
NOUVEAU_TITRE = "## ORDRE DES RANGS — QUEL lot vient ensuite".encode()


def abandon(msg):
    print(f"✗ ABANDON, RIEN N'EST ÉCRIT : {msg}")
    sys.exit(2)


def texte(nom):
    lignes = open(D + nom, encoding="utf-8").read().splitlines()
    while lignes and not lignes[-1].strip():
        lignes.pop()
    return [x.encode() for x in lignes]


def h(lignes):
    return hashlib.sha256(b"\r\n".join(lignes)).hexdigest()


avant = open(F, "rb").read()
crlf, lf, cr = avant.count(b"\r\n"), avant.count(b"\n"), avant.count(b"\r")
print(f"avant : {crlf} CRLF · LF nus {lf - crlf} (attendu 0) · CR seuls {cr - crlf} (attendu 0)")
if lf != crlf or cr != crlf:
    abandon("le fichier n'est pas en CRLF pur")
L = avant.split(b"\r\n")
if L[-1] != b"":
    abandon("le fichier ne finit pas par CRLF")
i_t = [i for i, x in enumerate(L) if x == SOUS_TITRE]
print(f"sous-titre de l'ordre trouvé {len(i_t)} fois (attendu 1)")
if len(i_t) != 1:
    abandon("sous-titre")
i_t = i_t[0]
i_s = next(i for i in range(i_t + 1, len(L)) if L[i].startswith(b"#"))
print(f"titre suivant : « {L[i_s][:60].decode()}… » (attendu : le sous-titre de D271)")
if not L[i_s].startswith(SUIVANT):
    abandon("le titre qui suit l'ordre n'est pas celui de D271")
corps = L[i_t + 1:i_s]
debut = next(i for i, x in enumerate(corps) if x.strip())
fin = len(corps) - next(i for i, x in enumerate(reversed(corps)) if x.strip())
blancs = (debut, len(corps) - fin)
corps = corps[debut:fin]
print(f"corps : {len(corps)} lignes, blancs de bord retirés {blancs} (attendu (1, 1)) · SHA-256 {h(corps)}")
if blancs != (1, 1):
    abandon("blancs de bord inattendus")
i_a = [i for i, x in enumerate(L) if x.startswith(b"## ") and ANCRE in x]
print(f"premier point d'entrée « PROCHAIN LOT » : ligne {i_a[0] + 1} · « {L[i_a[0]][:48].decode()}… »")
if not i_a or i_a[0] > i_t or b"rang 19" not in L[i_a[0]]:
    abandon("le premier point d'entrée n'est pas celui du rang 19, ou il n'est pas au-dessus de l'ordre")
i_a = i_a[0]
entete, renvoi = texte("entete-ordre.md"), texte("renvoi-D270.md")
if entete[0] != NOUVEAU_TITRE or sum(1 for x in L if x == NOUVEAU_TITRE):
    abandon("titre d'en-tête inattendu, ou déjà présent dans le fichier")
N = L[:i_a] + entete + [b""] + corps + [b""] + L[i_a:i_t + 1] + [b""] + renvoi + [b""] + L[i_s:]
open(F, "wb").write(b"\r\n".join(N))

# ---- relecture du FICHIER, jamais du compte rendu
apres = open(F, "rb").read()
M = apres.split(b"\r\n")
ok = True


def controle(libelle, mesure, attendu):
    global ok
    bon = mesure == attendu
    ok = ok and bon
    print(f"{'✓' if bon else '✗'} {libelle} : {mesure} (attendu {attendu})")


controle("LF nus après", apres.count(b"\n") - apres.count(b"\r\n"), 0)
controle("bilan de lignes", len(M) - len(L), len(entete) + len(renvoi) + 2)
t = [i for i, x in enumerate(M) if x == NOUVEAU_TITRE]
controle("nouveau titre ## trouvé", len(t), 1)
p = t[0] + len(entete) + 1
controle("empreinte du corps à la nouvelle place", h(M[p:p + len(corps)]), h(corps))
controle("après le corps : un blanc puis le point d'entrée du rang 19",
         (M[p + len(corps)], M[p + len(corps) + 1] == L[i_a]), (b"", True))
s = [i for i, x in enumerate(M) if x == SOUS_TITRE]
controle("sous-titre resté à sa place d'origine", len(s), 1)
controle("renvoi sous le sous-titre, puis D271", (M[s[0] + 2:s[0] + 2 + len(renvoi)] == renvoi,
                                                   M[s[0] + 3 + len(renvoi)].startswith(SUIVANT)), (True, True))
perdu = collections.Counter(L) - collections.Counter(M)
ajoute = collections.Counter(M) - collections.Counter(L)
controle("NON-PERTE : lignes de l'ancien fichier absentes du nouveau", sum(perdu.values()), 0)
controle("lignes en plus = exactement les lignes insérées",
         ajoute, collections.Counter(entete + renvoi + [b""] * 2) - collections.Counter())
print(f"== corps déplacé : {len(corps)} lignes · ancienne place {i_t + 2}-{i_s - 1} · nouvelle place "
      f"{p + 1}-{p + len(corps)} · fichier {len(L) - 1} → {len(M) - 1} lignes")
print("✓ DÉPLACEMENT VÉRIFIÉ" if ok else "✗ UN CONTRÔLE A ÉCHOUÉ — RESTAURER PAR `git checkout` ET NE RIEN CONCLURE")
sys.exit(0 if ok else 1)
