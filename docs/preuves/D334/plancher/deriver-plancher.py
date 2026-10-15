"""D334 — DÉRIVATION DU PLANCHER DE DURÉE (point 12) : 26 REPRIS (prouvé par `git`), 7 MESURÉS (`simuler-non-demarrage.py`). Procédure archivée comme preuve (D291), jamais promue en instrument. NOUVEAU SCRIPT (pas une copie : D330 prouvait « rien n'a bougé » ; ici
des harnais ONT bougé, et la règle est celle de la décision 4 du relecteur, 15/10/2026).

LA RÈGLE (décision 4 du relecteur) : « les planchers : réutilisés SEULEMENT pour les harnais dont le fichier n'a pas changé depuis leur dernière mesure, prouvé par `git` ; MESURÉS pour tous les autres, dont au moins `r37`, `r38`, `r39` (neufs) et chaque harnais réorienté
ou dont la constante a changé depuis D330 ».

CE QUE FAIT CE SCRIPT, dans l'ordre, avec son parcouru à côté de l'attendu (D290) :
  1. lit les 30 lignes `P` de `docs/preuves/D330/plancher/plancher.txt` (= celles de D329) et la sortie `docs/preuves/D329/plancher/deriver-plancher-sortie.txt` (quels harnais sont REPRIS de D324 — dernière mesure `257471d` —, lesquels MESURÉS à D329 — dernière mesure `4202dd4`) ;
  2. pour CHAQUE harnais de ces 30 : son objet git `neutralisation/neutralize-<h>.py` à HEAD est-il IDENTIQUE à celui de sa dernière mesure ? OUI ⇒ plancher REPRIS tel quel ; NON ⇒ le harnais est à MESURER ;
  3. ajoute les harnais présents à HEAD et absents des 30 (NEUFS) : à MESURER ; la liste MESURER obtenue doit être EXACTEMENT celle que `simuler-non-demarrage.py` a jouée (`MESURER`) ;
  4. TOUTE autre pièce de `neutralisation/` (lanceur, échantillonneur, sonde, audit) est identique entre `257471d` et `HEAD`, et les quatre harnais LUS (preuve lue, hors plancher) aussi ;
  5. lit `docs/preuves/D334/plancher/simulation-sortie.txt` (lignes `T <harnais> <mode> <n> <A> <B> <max> <✓>`) et dérive P = 3 × max(A, B) pour les harnais à mesurer ;
  6. écrit `plancher.txt` (33 lignes `P` : 26 reprises, 7 mesurées), lu par `docs/preuves/D334/outils/lire-campagnes.py`.
ÉCHEC À L'UN DES CONTRÔLES ⇒ sortie 2, `plancher.txt` n'est PAS écrit.
LIMITES ÉCRITES D'AVANCE : un plancher repris suppose que `pnpm` et `vitest` démarrent comme à D324/D329 sur ce poste (le script ne le vérifie pas) ; du CODE de production a changé depuis D329 (L35-1 à L35-3) : la règle de Ko porte sur le FICHIER DU HARNAIS, pas sur le code qu'il mute — c'est la décision 4, appliquée telle quelle ;
un plancher par campagne ne voit pas un non-démarrage partiel ; une mutation qui empêche la spec de se charger dure autant qu'un démarrage.
Calibration à deux bras (D286) : (positif) la règle de reprise REFUSE un harnais dont l'objet a changé entre sa dernière mesure et HEAD (`act-plafonds`, constante changée à D333) ; (négatif) elle ACCEPTE un harnais connu inchangé (`argon2`).
Usage, depuis la racine : python3 docs/preuves/D334/plancher/deriver-plancher.py > docs/preuves/D334/plancher/deriver-plancher-sortie.txt
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
ICI = os.path.dirname(os.path.abspath(__file__))
D324, D329 = "257471d", "4202dd4"
LUS = {"rang23", "available-on-api", "r25", "r26"}


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, check=True).stdout.decode("utf-8", errors="replace")


def blobs(sha):
    out = {}
    for l in git("ls-tree", "-r", sha, "--", "neutralisation").splitlines():
        meta, chemin = l.split("\t")
        out[chemin] = meta.split()[2]
    return out


chemin_h = lambda h: f"neutralisation/neutralize-{h}.py"
b0, b9, bh = blobs(D324), blobs(D329), blobs("HEAD")
tete = git("rev-parse", "HEAD").strip()
print(f"D334 — dérivation du plancher · HEAD {tete[:7]} · D324 {D324} · D329 {D329}")

# calibration
bras_pos = b9[chemin_h("act-plafonds")] != bh[chemin_h("act-plafonds")]                    # changé depuis sa mesure de D329 : la règle le REFUSE
bras_neg = b0[chemin_h("argon2")] == b9[chemin_h("argon2")] == bh[chemin_h("argon2")]       # inchangé partout : la règle l'ACCEPTE
print(f"  {'✓' if bras_pos else '✗'} calibration : positif — act-plafonds (objet {b9[chemin_h('act-plafonds')][:7]} à D329, {bh[chemin_h('act-plafonds')][:7]} à HEAD) serait REFUSÉ comme « repris »")
print(f"  {'✓' if bras_neg else '✗'} calibration : négatif — argon2 (inchangé depuis D324) est ACCEPTÉ")
if not (bras_pos and bras_neg):
    sys.exit("✗ ABANDON : calibration manquée")

# 1. les 30 planchers de D329 et leur origine
p329 = open("docs/preuves/D329/plancher/plancher.txt", encoding="utf-8").read().replace("\r\n", "\n")
p330 = open("docs/preuves/D330/plancher/plancher.txt", encoding="utf-8").read().replace("\r\n", "\n")
lignes_p = [l for l in p329.split("\n") if l.startswith("P ")]
lignes_p330 = [l for l in p330.split("\n") if l.startswith("P ")]
sortie329 = open("docs/preuves/D329/plancher/deriver-plancher-sortie.txt", encoding="utf-8").read().replace("\r\n", "\n")
origine = {m[1]: m[2] for m in re.finditer(r"^  (\S+)\s+\S+\s+P\s+[\d.]+ s · (REPRIS de D324|MESURÉ à D329)", sortie329, re.M)}
noms = [l.split()[1] for l in lignes_p]
print(f"planchers de D329 : {len(lignes_p)} (attendu 30) · ceux de D330 identiques ligne pour ligne : {lignes_p == lignes_p330} · origine connue pour {len(origine)} (attendu 30)")
erreurs = []
if len(lignes_p) != 30 or len(origine) != 30 or lignes_p != lignes_p330:
    erreurs.append("les planchers de D329/D330 ne se retrouvent pas")

# 2. reprise ou mesure
derniere = {h: (D324 if origine.get(h, "").startswith("REPRIS") else D329) for h in noms}
blob_derniere = {D324: b0, D329: b9}
repris, a_mesurer = [], []
for h in noms:
    c = chemin_h(h)
    b = blob_derniere[derniere[h]]
    if c in b and c in bh and b[c] == bh[c]:
        repris.append(h)
    else:
        a_mesurer.append(h)
# 3. les neufs
harnais_hd = sorted(c[len("neutralisation/neutralize-"):-3] for c in bh if c.startswith("neutralisation/neutralize-") and c.endswith(".py"))
neufs = sorted(h for h in harnais_hd if h not in noms and h not in LUS)
a_mesurer = sorted(a_mesurer + neufs)
print(f"harnais à HEAD : {len(harnais_hd)} (attendu 37) · REPRIS : {len(repris)} (attendu 26) · à MESURER : {len(a_mesurer)} → {a_mesurer} (attendu 7 : act-plafonds, horloge, r33, r37, r38, r39, s10b) · neufs : {neufs}")
if len(repris) != 26 or a_mesurer != ["act-plafonds", "horloge", "r33", "r37", "r38", "r39", "s10b"]:
    erreurs.append("la partition repris / à mesurer n'est pas celle attendue")
src_simul = open(os.path.join(ICI, "simuler-non-demarrage.py"), encoding="utf-8").read()
mm = re.search(r'^MESURER = \[(.*?)\]', src_simul, re.M)
mesurer_simul = sorted(x.strip().strip('"') for x in mm.group(1).split(",")) if mm else None
print(f"liste MESURER de la simulation : {mesurer_simul} · égale à la liste à mesurer : {mesurer_simul == a_mesurer}")
if mesurer_simul != a_mesurer:
    erreurs.append("la simulation n'a pas joué la liste à mesurer")

# 4. les autres pièces de neutralisation/ et les harnais LUS
autres = sorted(c for c in set(b0) | set(bh) if not (c.startswith("neutralisation/neutralize-") and c.endswith(".py")) and b0.get(c) != bh.get(c))
lus_chg = sorted(h for h in LUS if b0.get(chemin_h(h)) != bh.get(chemin_h(h)))
print(f"pièces de `neutralisation/` AUTRES que les harnais, changées depuis D324 : {len(autres)} (attendu 0) {autres} · harnais LUS changés depuis D324 : {len(lus_chg)} (attendu 0) {lus_chg}")
if autres:
    erreurs.append(f"pièces de neutralisation/ changées : {autres}")
if lus_chg:
    erreurs.append(f"harnais lus changés : {lus_chg}")
chg_depuis_d330 = sorted(h for h in harnais_hd if b9.get(chemin_h(h)) != bh[chemin_h(h)])
print(f"harnais changés ou neufs depuis la dernière passe (D329/D330, `4202dd4`) : {len(chg_depuis_d330)} → {chg_depuis_d330}")
diff = [f for f in git("diff", "--name-only", D329, "HEAD").splitlines() if f.strip()]
hors = sorted(f for f in diff if not (f in {"AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md"} or f.startswith("docs/preuves/")))
print(f"INFORMATION (pas un contrôle — voir les limites) : diff {D329}..HEAD : {len(diff)} fichier(s), dont {len(hors)} hors `docs/preuves/` et hors les trois `.md`")

# 5. la simulation
sim = {}
simulation = open(os.path.join(ICI, "simulation-sortie.txt"), encoding="utf-8").read().replace("\r\n", "\n")
for l in simulation.split("\n"):
    if l.startswith("T "):
        _, nom, mode, n, ta, tb, tmax, mordues = l.split()
        sim[nom] = (mode, float(ta), float(tb), float(tmax))
print(f"lignes T de la simulation : {len(sim)} (attendu 7) · harnais : {sorted(sim)}")
if sorted(sim) != a_mesurer:
    erreurs.append("les lignes T ne couvrent pas la liste à mesurer")
manque = re.search(r"BRAS ET DÉFAUTS MANQUÉS : (\d+) \(attendu 0\)", simulation)
print(f"bras et défauts manqués de la simulation : {manque.group(1) if manque else 'ABSENT'} (attendu 0)")
if not manque or manque.group(1) != "0":
    erreurs.append("la simulation a manqué un bras")

if erreurs:
    print("\n✗ ÉCHEC : " + " ; ".join(erreurs) + "\nplancher.txt N'EST PAS écrit.")
    sys.exit(2)

# 6. plancher.txt
par_nom = {l.split()[1]: l for l in lignes_p}
finales = {}
for h in repris:
    finales[h] = par_nom[h]
for h in a_mesurer:
    mode, ta, tb, tmax = sim[h]
    finales[h] = f"P {h} {'--int' if mode == '--int' else 'tout'} {round(3 * tmax, 2):g}"
sorties = [finales[h] for h in sorted(finales)]
entete = (f"# D334 — plancher de durée par campagne, P = 3 × T. 26 REPRIS (objet du harnais identique à celui de sa dernière mesure — `{D324}` ou `{D329}` — et à HEAD : preuve `deriver-plancher-sortie.txt`), 7 MESURÉS à D334 (act-plafonds, horloge, r33, r37, r38, r39, s10b ;\n"
          f"# `simuler-non-demarrage.py`, non-démarrage simulé sous deux niveaux de cale, calibration à trois bras). Commité AVANT toute mesure de la passe.\n"
          "# Format : P <harnais> <passe qui certifie> <plancher en secondes>. Écrit par deriver-plancher.py ; lu par docs/preuves/D334/outils/lire-campagnes.py.\n")
open(os.path.join(ICI, "plancher.txt"), "w", encoding="utf-8", newline="\n").write(entete + "\n".join(sorties) + "\n")
relu = [l for l in open(os.path.join(ICI, "plancher.txt"), encoding="utf-8").read().split("\n") if l.startswith("P ")]
print(f"plancher.txt écrit : {len(relu)} lignes P (attendu 33) · les 26 repris identiques à leur ligne d'origine : {all(finales[h] == par_nom[h] for h in repris)}")
assert len(relu) == 33 and all(finales[h] == par_nom[h] for h in repris)
for h in sorted(finales):
    print(f"  {h:18s} {'REPRIS' if h in repris else 'MESURÉ':7s} {finales[h]}")
print("\nTOUT TIENT : 26 planchers repris (prouvés par les objets git), 7 mesurés (3 × T).")
