"""D300 — les renvois RELATIFS de l'ordre des rangs, relevés sur l'état d'AVANT le lot (`git show HEAD`, 0a8235d).
Usage, depuis la racine : python3 docs/preuves/D300/deplacement/renvois-relatifs.py
Pourquoi : déplacer un bloc casse tout renvoi relatif qui sort de lui (« plus haut » vise alors ce qui précède la
NOUVELLE place). Liste chaque renvoi relatif du corps du sous-titre « ### D270 — ordre des lots, révisé par Ko »,
avec sa ligne ; le tri — interne à l'ordre, vers les points d'entrée « en tête de ce fichier », ou SORTANT — se
fait à la main et s'écrit dans la section D300 (un classement automatique d'une cible de renvoi serait deviné).
Texte aplati ligne à ligne ET sur le bloc entier : une expression coupée par un retour à la ligne ne sort pas en
ligne à ligne (D294) — les deux comptes s'impriment, l'écart est ce que l'aplatissement a rattrapé."""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)
RX = re.compile(r"(?i)plus haut|plus bas|ci-dessus|ci-dessous|au-dessus|en dessous|en tête de ce fichier|"
                r"lignes plus|rangs plus|cette section|ce bloc")
brut = subprocess.run(["git", "show", "HEAD:ZWADJ_CONTINUITE.md"], capture_output=True, check=True).stdout
L = brut.decode("utf-8").splitlines()
t = [i for i, x in enumerate(L) if x == "### D270 — ordre des lots, révisé par Ko"]
if len(t) != 1:
    print(f"ABANDON : sous-titre trouvé {len(t)} fois (attendu 1)")
    sys.exit(2)
fin = next(i for i in range(t[0] + 1, len(L)) if L[i].startswith("#"))
corps = L[t[0] + 1:fin]
print(f"corps de l'ordre à 0a8235d : lignes {t[0] + 2} à {fin} · {len(corps)} lignes parcourues")
n_lignes = 0
for k, x in enumerate(corps):
    for m in RX.finditer(x.replace("*", "")):
        n_lignes += 1
        print(f"   l. {t[0] + 2 + k} [{m.group(0)}] …{x.replace('*', '').strip()[:120]}…")
plat = re.sub(r"\s+", " ", " ".join(corps).replace("*", ""))
print("== sur le texte APLATI, chacun avec son contexte (c'est ici que se voient ceux qu'un retour à la ligne coupe) :")
n_plat = 0
for m in RX.finditer(plat):
    n_plat += 1
    print(f"   #{n_plat} [{m.group(0)}] …{plat[max(0, m.start() - 90):m.end() + 50]}…")
print(f"== renvois relatifs : {n_lignes} en ligne à ligne · {n_plat} sur le texte aplati "
      f"(écart {n_plat - n_lignes} = coupés par un retour à la ligne)")
