"""D330 — DÉRIVATION DU PLANCHER DE DURÉE (point 12) À LA SECONDE PASSE : RÉEMPLOI DES 30 PLANCHERS DE D329, PROUVÉ PAR `git`. Procédure archivée comme preuve (D291), jamais promue en instrument. NOUVEAU SCRIPT (pas une copie de celui de D329 :
D329 composait deux sources et prouvait leur inchangement depuis D324 ; ici il n'y a plus qu'une source, `docs/preuves/D329/plancher/plancher.txt`, et la preuve est que RIEN n'a bougé depuis la passe de D329).

LA RÈGLE (Ko, 12/10/2026, reconduite par la consigne de reprise) : « les mêmes planchers (26 repris, 4 mesurés), valables tant que les harnais n'ont pas changé ; à prouver par `git` ».

CE QUE FAIT CE SCRIPT, dans l'ordre, avec son parcouru à côté de l'attendu (D290) :
  1. lit les 30 lignes `P` de `docs/preuves/D329/plancher/plancher.txt` et la sortie `deriver-plancher-sortie.txt` de D329 (quels harnais sont REPRIS de D324, lesquels MESURÉS à D329) ;
  2. pour CHAQUE harnais repris : son objet git `neutralisation/neutralize-<h>.py` est IDENTIQUE à `257471d` (la passe de D324 qui l'a mesuré), à `4202dd4` (la passe de D329) et à `HEAD` ; pour CHAQUE harnais mesuré : identique à `4202dd4` et à `HEAD` ;
  3. TOUTE autre pièce de `neutralisation/` (lanceur, échantillonneur, sonde, audit) est identique entre `257471d` et `HEAD`, et les quatre harnais LUS (preuve lue, hors plancher) aussi ;
  4. LE DIFF `4202dd4..HEAD` NE CONTIENT AUCUN FICHIER HORS `docs/preuves/` ET HORS LES TROIS `.md` D'AUTORITÉ : ni code produit, ni test, ni harnais, ni migration, ni `package.json`, ni `docker-compose.yml`, ni `.gitattributes` — c'est la preuve la plus forte :
     le code que les harnais appellent est celui que D329 a mesuré ;
  5. écrit `plancher.txt` (30 lignes `P`, mêmes chiffres que D329), lu par `docs/preuves/D330/outils/lire-campagnes.py`.
ÉCHEC À L'UN DES CONTRÔLES ⇒ sortie 2, `plancher.txt` n'est PAS écrit.
LIMITES ÉCRITES D'AVANCE : un plancher repris suppose que `pnpm` et `vitest` démarrent comme à D324/D329 sur ce poste (le script ne le vérifie pas ; c'est la limite de D329 reconduite, ordre des rangs, écart n° 1) ; une mutation qui empêche la spec de se charger dure autant qu'un démarrage ;
un plancher par campagne ne voit pas un non-démarrage partiel.
Calibration à deux bras (D286) : (positif) la règle de reprise REFUSE un harnais dont l'objet a changé entre `257471d` et `4202dd4` (`act-plafonds`, changé à D325/D326) ; (négatif) elle ACCEPTE un harnais connu inchangé (`argon2`).
Usage, depuis la racine : python3 docs/preuves/D330/plancher/deriver-plancher.py > docs/preuves/D330/plancher/deriver-plancher-sortie.txt
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
AUTORITES = {"AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md"}
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
print(f"D330 — dérivation du plancher · HEAD {tete[:7]} · D324 {D324} · D329 {D329}")


def reprise_acceptee(h, depuis):
    """Un plancher est REPRIS pour h si son objet est identique à `depuis` ET à HEAD."""
    c = chemin_h(h)
    return c in depuis and c in bh and depuis[c] == bh[c]


# calibration
bras_pos = not (b0[chemin_h("act-plafonds")] == b9[chemin_h("act-plafonds")])        # changé entre D324 et D329 : la règle (« identique à D324 ») le REFUSE
bras_neg = b0[chemin_h("argon2")] == b9[chemin_h("argon2")] == bh[chemin_h("argon2")]   # inchangé partout : la règle l'ACCEPTE
print(f"  {'✓' if bras_pos else '✗'} calibration : positif — act-plafonds (changé entre D324 et D329) serait REFUSÉ comme « repris de D324 » (objets {b0[chemin_h('act-plafonds')][:7]} contre {b9[chemin_h('act-plafonds')][:7]})")
print(f"  {'✓' if bras_neg else '✗'} calibration : négatif — argon2 (inchangé) est ACCEPTÉ")
if not (bras_pos and bras_neg):
    sys.exit("✗ ABANDON : calibration manquée")

# 1. les planchers de D329 et d'où ils viennent
p329 = open("docs/preuves/D329/plancher/plancher.txt", encoding="utf-8").read().replace("\r\n", "\n")
lignes_p = [l for l in p329.split("\n") if l.startswith("P ")]
sortie329 = open("docs/preuves/D329/plancher/deriver-plancher-sortie.txt", encoding="utf-8").read().replace("\r\n", "\n")
origine = {m[1]: m[2] for m in re.finditer(r"^  (\S+)\s+\S+\s+P\s+[\d.]+ s · (REPRIS de D324|MESURÉ à D329)", sortie329, re.M)}
noms = [l.split()[1] for l in lignes_p]
repris = sorted(h for h in noms if origine.get(h, "").startswith("REPRIS"))
mesures = sorted(h for h in noms if origine.get(h, "").startswith("MESURÉ"))
print(f"planchers lus : {len(lignes_p)} (attendu 30) · origine connue pour {len(origine)} (attendu 30) · REPRIS de D324 : {len(repris)} (attendu 26) · MESURÉS à D329 : {len(mesures)} → {mesures} (attendu 4 : act-plafonds, horloge, r32, r33)")
erreurs = []
if len(lignes_p) != 30 or len(origine) != 30 or len(repris) != 26 or mesures != ["act-plafonds", "horloge", "r32", "r33"]:
    erreurs.append("les compteurs de D329 ne se retrouvent pas")

# 2. chaque harnais : objet identique
for h in repris:
    c = chemin_h(h)
    ok = c in b0 and c in b9 and c in bh and b0[c] == b9[c] == bh[c]
    if not ok:
        erreurs.append(f"REPRIS {h} : objet différent entre D324, D329 et HEAD")
for h in mesures:
    c = chemin_h(h)
    if not (c in b9 and c in bh and b9[c] == bh[c]):
        erreurs.append(f"MESURÉ {h} : objet différent entre D329 et HEAD")
print(f"harnais repris dont l'objet est identique à D324, à D329 et à HEAD : {sum(1 for h in repris if chemin_h(h) in b0 and b0[chemin_h(h)] == b9[chemin_h(h)] == bh[chemin_h(h)])} sur {len(repris)} · harnais mesurés identiques à D329 et à HEAD : {sum(1 for h in mesures if b9[chemin_h(h)] == bh[chemin_h(h)])} sur {len(mesures)}")

# 3. les autres pièces de neutralisation/ et les harnais LUS
autres = sorted(c for c in set(b0) | set(bh) if not (c.startswith("neutralisation/neutralize-") and c.endswith(".py")) and b0.get(c) != bh.get(c))
lus_chg = sorted(h for h in LUS if b0.get(chemin_h(h)) != bh.get(chemin_h(h)))
print(f"pièces de `neutralisation/` AUTRES que les harnais, changées depuis D324 : {len(autres)} (attendu 0) {autres} · harnais LUS changés depuis D324 : {len(lus_chg)} (attendu 0) {lus_chg} · pièces parcourues : {len(set(b0) | set(bh))}")
if autres:
    erreurs.append(f"pièces de neutralisation/ changées : {autres}")
if lus_chg:
    erreurs.append(f"harnais lus changés : {lus_chg}")
harnais_hd = sorted(c for c in bh if c.startswith("neutralisation/neutralize-") and c.endswith(".py"))
chg_depuis_d329 = sorted(c for c in harnais_hd if b9.get(c) != bh[c])
print(f"harnais à HEAD : {len(harnais_hd)} (attendu 34) · changés ou neufs depuis D329 : {len(chg_depuis_d329)} (attendu 0) {chg_depuis_d329}")
if len(harnais_hd) != 34 or chg_depuis_d329:
    erreurs.append("les 34 harnais ne sont pas ceux de D329")

# 4. le diff D329..HEAD
diff = [f for f in git("diff", "--name-only", D329, "HEAD").splitlines() if f.strip()]
hors = sorted(f for f in diff if not (f in AUTORITES or f.startswith("docs/preuves/")))
print(f"diff {D329}..HEAD : {len(diff)} fichier(s), dont HORS `docs/preuves/` et hors les trois `.md` : {len(hors)} (attendu 0) {hors}")
if hors:
    erreurs.append(f"fichiers de code changés depuis D329 : {hors}")

if erreurs:
    print("\n✗ ÉCHEC : " + " ; ".join(erreurs) + "\nplancher.txt N'EST PAS écrit.")
    sys.exit(2)

# 5. plancher.txt
entete = (f"# D330 — plancher de durée par campagne, P = 3 × T. 30 planchers REPRIS DE D329, sans retouche d'un chiffre : 26 REPRIS de D324 (objet du harnais identique à `{D324}`, à `{D329}` et à HEAD), 4 MESURÉS à D329 (act-plafonds, horloge, r32, r33 ;\n"
          f"# objet identique à `{D329}` et à HEAD). Preuve : `deriver-plancher-sortie.txt` (objets git ; aucun fichier de code ne change entre `{D329}` et HEAD). Commité AVANT toute mesure de la passe.\n"
          "# Format : P <harnais> <passe qui certifie> <plancher en secondes>. Écrit par deriver-plancher.py ; lu par docs/preuves/D330/outils/lire-campagnes.py.\n")
open(os.path.join(ICI, "plancher.txt"), "w", encoding="utf-8", newline="\n").write(entete + "\n".join(lignes_p) + "\n")
relu = [l for l in open(os.path.join(ICI, "plancher.txt"), encoding="utf-8").read().split("\n") if l.startswith("P ")]
print(f"plancher.txt écrit : {len(relu)} lignes P (attendu 30) · identiques à D329 ligne pour ligne : {relu == lignes_p}")
assert relu == lignes_p
print("\nTOUT TIENT : les 30 planchers de D329 sont repris, la preuve est dans les objets git.")
