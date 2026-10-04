"""D324 — COPIE de `docs/preuves/D314/plancher/deriver-plancher.py` (pièce de D314, non retouchée), MODIFICATION DÉCLARÉE : les noms
`D314`/`d314` du CODE (en-tête du `plancher.txt` écrit, chemin du lecteur cité) deviennent `D324`/`d324` — 2 occurrences. (2) PASSAGE 2 : le nombre de non-démarrages attendus passe de 26 à 28 (r29 et r30 sont simulés) et, pour ces deux-là seulement, la durée « réelle » qui
sert de PRÉDICTION (jamais de critère) est celle de leur campagne versée par D322, D310 ne les connaissant pas. Rien d'autre ;
les durées de D310, qui servent de PRÉDICTION et jamais de critère, restent celles de D310 pour les 26 autres.
Usage : python docs/preuves/D324/plancher/deriver-plancher.py
"""
"""D314 — DÉRIVATION DU PLANCHER DE DURÉE (point 12, Ko, D313, 1b), À PARTIR DE LA SEULE MESURE DE L'ÉTAPE 0
(`simulation-sortie.txt`, lignes « T ») ; écrit `plancher.txt`, que lit le lecteur des campagnes. Procédure archivée comme
preuve (D291). Usage, depuis la racine :  python docs/preuves/D314/plancher/deriver-plancher.py

⛔ LE CHOIX, DÉCLARÉ ET MOTIVÉ (Ko : « un seul plancher ou un par campagne, à ton choix, déclaré et motivé, avec sa
marge ») : UN PLANCHER PAR CAMPAGNE, P = K × T, K = 3, où T est le non-démarrage simulé le plus LONG de la campagne
(max des niveaux A et B), mesuré dans la passe qui la CERTIFIE.
  · PAR CAMPAGNE, parce que les deux formes à un seul nombre ÉCHOUENT sur les mesures — calcul imprimé ci-dessous :
    un plancher ABSOLU doit dépasser le plus long non-démarrage (`404`, 14,63 s) et, à marge 3 (43,89 s), refuserait
    cinq campagnes réelles de D310 (`argon2`, `booking-status`, `budgets`, `solid-s4`, `solid-s5a`) ; un plancher PAR
    CIBLE doit dépasser le plus long non-démarrage par cible (`journey`, 1,74 s) et, à marge 3 (5,22 s par cible),
    refuserait `s10b`, `s11a`, `solid-s4`, `solid-s5a`. ⚠ Ces deux listes ont d'abord été écrites ici AVANT le calcul, et
    fausses (« `available-on`, 1,22 s », « refuserait `s11a` ») : elles sont recopiées de la sortie imprimée.
  · K = 3 : la marge au-dessus du non-démarrage absorbe un non-démarrage TROIS FOIS plus lent que mesuré (charge, disque
    froid) ; et, sur les durées réelles VERSÉES de D310, le rapport réel / non-démarrage le plus bas est ≈ 10,8 — K = 3 est
    sous sa racine (≈ 3,3), ce qui laisse de part et d'autre une marge du même ordre. ⚠ Les durées de D310 servent de
    PRÉDICTION, jamais de critère : le critère est P, dérivé de T seul.
  · Lecture : la colonne « sec » de la table de `lancer-campagnes.py --tout` (secondes ARRONDIES) ou la durée de
    `int-<harnais>.heures` ; une campagne compte si durée ≥ P.
⚠ LIMITE, écrite telle quelle par Ko : « une mutation qui empêche la spec de se charger dure autant qu'un démarrage (cas
« Tests no tests » de D312). Un plancher ne la distingue pas d'une morsure. Ces morsures s'écrivent « code de sortie
seul ». Les distinguer est le travail de R1, en pause. » ⚠ Et un plancher par CAMPAGNE ne voit pas une campagne dont une
PARTIE seulement des mesures n'aurait pas démarré (dérivé par la session).
"""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
ICI = os.path.dirname(os.path.abspath(__file__))
K = 3
T, N, MODE = {}, {}, {}
for l in open(os.path.join(ICI, "simulation-sortie.txt"), encoding="utf-8"):
    if l.startswith("T "):
        _, nom, mode, n, ta, tb, tmax, _m = l.split()
        T[nom], N[nom], MODE[nom] = float(tmax), int(n), mode
print(f"non-démarrages lus : {len(T)} (attendu 28)")
if len(T) != 28:
    sys.exit("✗ ABANDON")

# Durées RÉELLES de la passe versée de D310 — PRÉDICTION seulement.
P310 = "docs/preuves/D310/passe-r23c-20260926-0032"
tout = open(os.path.join(P310, "campagnes-tout.log"), encoding="utf-8").read()
R = {m.group(1): int(m.group(2)) for m in re.finditer(r"^neutralize-([\w-]+)\.py\s+\d+\s+\S+\s+\d+\s+\d+\s+\d+\s+(\d+)\s*$", tout, re.M)}
for nom, mode in MODE.items():
    if mode == "--int":
        R[nom] = int(re.search(r"· (\d+) s ·", open(os.path.join(P310, f"int-{nom}.heures"), encoding="utf-8").read()).group(1))

for _nom, _chemin in (("r29", "docs/preuves/D322/neutralisation/campagne-r29.log"), ("r30", "docs/preuves/D322/neutralisation/campagne-r30.log")):
    if _nom in MODE and _nom not in R:   # [D324 passage 2] prédiction : durée versée par D322
        R[_nom] = int(re.search(r"^campagne \S+ code=\d+ durée=(\d+)s", open(_chemin, encoding="utf-8").read(), re.M).group(1))
print("\n== POURQUOI PAR CAMPAGNE — les deux formes à un seul nombre, calculées sur ces mesures")
tmax = max(T.values())
absolu = K * tmax
refus_abs = sorted(n for n in T if R[n] < absolu)
print(f"  plancher ABSOLU = {K} × {tmax:.2f} s ({max(T, key=T.get)}) = {absolu:.2f} s ⇒ refuserait à D310 : {refus_abs}")
par_cible = max(T[n] / N[n] for n in T)
qui = max(T, key=lambda n: T[n] / N[n])
refus_pc = sorted(n for n in T if R[n] / N[n] < K * par_cible)
print(f"  plancher PAR CIBLE = {K} × {par_cible:.3f} s ({qui}) = {K * par_cible:.2f} s par cible ⇒ refuserait à D310 : {refus_pc}")

print("\n== PLANCHER PAR CAMPAGNE, P = 3 × T — et la prédiction sur D310 (réel / P)")
lignes = [f"# D324 — plancher de durée par campagne, P = {K} × T (T : non-démarrage simulé le plus long, étape 0).",
          "# Format : P <harnais> <passe qui certifie> <plancher en secondes>. Écrit par deriver-plancher.py ; lu par",
          "# docs/preuves/D324/outils/lire-campagnes.py. Commité AVANT toute mesure de la passe."]
rapports = []
for nom in sorted(T):
    p = round(K * T[nom], 2)
    lignes.append(f"P {nom} {MODE[nom]} {p}")
    rapports.append((R[nom] / p, nom))
    print(f"  {nom:16s} {MODE[nom]:5s} T {T[nom]:6.2f} s · P {p:6.2f} s · D310 réel {R[nom]:4d} s · réel / P {R[nom] / p:6.1f}"
          f" · réel / T {R[nom] / T[nom]:6.1f}{'   ⚠ SOUS LE PLANCHER' if R[nom] < p else ''}")
open(os.path.join(ICI, "plancher.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
bas = min(rapports)
print(f"\nplancher.txt : {len(lignes) - 3} lignes P (attendu 28)")
print(f"PRÉDICTION : campagnes de D310 sous leur plancher : {sum(1 for r, _ in rapports if r < 1)} (attendu 0) · rapport réel / P le plus "
      f"bas {bas[0]:.1f} ({bas[1]}) · rapport réel / T le plus bas {min(R[n] / T[n] for n in T):.1f}")
