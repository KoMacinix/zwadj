"""D329 — EXTRAIT VERSABLE du journal de `pnpm test:int` d'une passe. NOUVEAU SCRIPT (pièce versée, pas un instrument promu), écrit pour CE journal et pour ce qu'il a montré.
POURQUOI : le journal brut de `test:int` n'avait jamais porté de valeur sensible — jusqu'à la passe `r36a-20261012-1651`, où deux assertions ont échoué et vitest a imprimé le TEXTE REÇU de deux
e-mails de test : chacun portait un lien de vérification (`…?token=` suivi de 43 caractères) construit sur l'hôte d'un TUNNEL DE DÉVELOPPEMENT (`*.devtunnels.ms`) que le `.env` local de Ko
avait substitué à `http://localhost:3000`. Ce journal ne se verse pas tel quel (règle du point 9 du critère pour l'e2e, étendue ici par la même raison).
RÈGLE (D291 : « une preuve ne se caviarde pas ») : on RETIRE des lignes entières, on n'en RETOUCHE aucune. Sont retirées : toute ligne qui porte `token=` suivi d'au moins 20 caractères de jeton, et toute
ligne qui porte l'hôte d'un tunnel (`devtunnels.ms`). Les codes ANSI sont retirés de la sortie. Tout le reste est gardé tel quel, y compris les titres de test et la ligne `AssertionError` (tronquée par vitest
avant l'hôte).
CONTRÔLES (D290 : chaque compte à côté de son attendu) : lignes parcourues (par `splitlines()`, jamais `split("\\n")`, D294), gardées, retirées ; valeurs sensibles dans le journal ET dans l'extrait (attendu : > 0
dans le journal pour que l'extrait ait un objet ; **0 dans l'extrait**, sinon ABANDON et rien n'est écrit). L'empreinte SHA-256 du journal complet est écrite en tête de l'extrait.
CALIBRATION, deux bras, avant de servir (D286) : (positif) un texte construit avec une ligne à jeton et une ligne à hôte de tunnel → les deux sont retirées, la ligne neutre est gardée ; (négatif) un texte sans
aucune valeur → rien n'est retiré, l'extrait est identique à l'entrée (aux codes ANSI près).
Usage, depuis la racine : python3 docs/preuves/D329/outils/extraire-testint.py <journal brut> <destination>
"""
import hashlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
JETON = re.compile(r"token=[A-Za-z0-9_-]{20,}")
TUNNEL = re.compile(r"devtunnels\.ms", re.I)


def extraire(texte: str) -> tuple:
    lignes = ANSI.sub("", texte).splitlines()
    gardees = [l for l in lignes if not (JETON.search(l) or TUNNEL.search(l))]
    return lignes, gardees


def valeurs(texte: str) -> tuple:
    t = ANSI.sub("", texte)
    return len(JETON.findall(t)), len(TUNNEL.findall(t))


# calibration
construit = "ligne neutre\n  + https://abc-3000.devtunnels.ms/fr/auth/verification-email?token=" + "A" * 43 + "\nautre ligne neutre\nrecu: ?token=" + "b" * 30 + "\n"
l1, g1 = extraire(construit)
b_pos = g1 == ["ligne neutre", "autre ligne neutre"] and len(l1) == 4
neutre = "un test\nun autre test\n"
l2, g2 = extraire(neutre)
b_neg = g2 == l2 == ["un test", "un autre test"]
print(f"calibration : positif (jeton + hôte de tunnel retirés, neutres gardés) {'✓' if b_pos else '✗'} · négatif (rien à retirer, identique) {'✓' if b_neg else '✗'}")
if not (b_pos and b_neg):
    sys.exit("✗ ABANDON : calibration manquée")
if len(sys.argv) != 3:
    sys.exit("usage : extraire-testint.py <journal brut> <destination>")
brut = open(sys.argv[1], "rb").read()
texte = brut.decode("utf-8", errors="replace")
lignes, gardees = extraire(texte)
dans_journal = valeurs(texte)
sortie = "\n".join(gardees) + "\n"
dans_extrait = valeurs(sortie)
print(f"journal : {len(lignes)} lignes parcourues · gardées {len(gardees)} · retirées {len(lignes) - len(gardees)} · valeurs sensibles dans le journal (jetons, hôtes de tunnel) {dans_journal} → dans l'extrait {dans_extrait} (attendu (0, 0))")
if dans_extrait != (0, 0):
    sys.exit("✗ ABANDON : une valeur sensible survit à l'extraction — rien n'est écrit")
entete = (f"# EXTRAIT du journal de `pnpm test:int` — empreinte SHA-256 du journal COMPLET : {hashlib.sha256(brut).hexdigest()} ({len(brut)} octets, {len(lignes)} lignes)\n"
          f"# {len(lignes) - len(gardees)} ligne(s) retirée(s) (jeton `token=…` ou hôte `devtunnels.ms`), aucune retouchée ; codes ANSI retirés. Par docs/preuves/D329/outils/extraire-testint.py.\n")
open(sys.argv[2], "w", encoding="utf-8", newline="\n").write(entete + sortie)
print(f"écrit : {sys.argv[2]}")
