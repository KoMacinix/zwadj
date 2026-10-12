"""D329 — DÉRIVATION DU PLANCHER DE DURÉE (point 12) À D329 : réemploi des planchers de D324 POUR LES HARNAIS INCHANGÉS, mesure pour les autres. Procédure archivée comme preuve (D291), jamais promue
en instrument. NOUVEAU SCRIPT (pas une copie de celui de D324 : D324 dérivait 28 planchers d'une seule simulation ; ici deux sources se composent, et la composition est ce qu'il faut prouver).

LA RÈGLE (Ko, 12/10/2026) : « PLANCHERS : réutilisés SEULEMENT pour les harnais dont le fichier n'a pas changé depuis la mesure de D324, prouvé par `git diff` (précédent de D319) ; MESURÉS pour tous
les autres, dont au moins `r32` et `r33` (neufs) et `act-plafonds` et `horloge` (compte figé changé à D325). »

CE QUE FAIT CE SCRIPT, dans l'ordre, avec son parcouru à côté de l'attendu (D290) :
  1. relève, par `git ls-tree`, les harnais `neutralize-*.py` à `HEAD` et à la mesure de D324 (`257471d`, SHA de départ de sa passe : « sur `257471d` ») ; compare leurs objets git (blob) ;
  2. REPREND de `docs/preuves/D324/plancher/plancher.txt` le plancher de chaque harnais dont le blob est IDENTIQUE aux deux SHA (le fichier du harnais n'a pas changé) ; refuse tout plancher repris
     pour un harnais dont le blob diffère ;
  3. MESURE les autres : les lignes « T » de `docs/preuves/D329/plancher/simulation-sortie.txt` (étape 0 de D329), P = 3 × T, comme D324 (K = 3, arrondi à deux décimales) ;
  4. vérifie que toute autre pièce de `neutralisation/` (lanceur, échantillonneur, sonde, audit) est inchangée depuis `257471d` — un plancher repris suppose que ce que le harnais appelle n'a pas changé ;
  5. vérifie que les harnais lus (preuve LUE, hors plancher) sont les quatre de D324 et qu'aucun n'a changé ;
  6. écrit `plancher.txt` (nouveau), lu par `docs/preuves/D329/outils/lire-campagnes.py`.
ÉCHEC À L'UN DES CONTRÔLES ⇒ sortie 2, `plancher.txt` n'est PAS écrit.
Calibration à deux bras (D286) : (positif) la règle de reprise REFUSE un harnais dont le blob a changé (act-plafonds, vu à D325/D326) ; (négatif) elle ACCEPTE un harnais connu inchangé (argon2).
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
ICI = os.path.dirname(os.path.abspath(__file__))
D324 = "257471d"
K = 3
LUS = {"rang23", "available-on-api", "r25", "r26"}


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, check=True).stdout.decode("utf-8", errors="replace")


def blobs(sha):
    out = {}
    for l in git("ls-tree", "-r", sha, "--", "neutralisation").splitlines():
        meta, chemin = l.split("\t")
        out[chemin] = meta.split()[2]
    return out


b0, b1 = blobs(D324), blobs("HEAD")
nom_de = lambda c: c[len("neutralisation/neutralize-"):-3] if c.startswith("neutralisation/neutralize-") and c.endswith(".py") else None
H0 = {nom_de(c): b for c, b in b0.items() if nom_de(c)}
H1 = {nom_de(c): b for c, b in b1.items() if nom_de(c)}
print(f"harnais à {D324} : {len(H0)} (attendu 32) · à HEAD : {len(H1)} (attendu 34)")
inchanges = sorted(n for n in H0 if n in H1 and H0[n] == H1[n])
changes = sorted(n for n in H0 if n in H1 and H0[n] != H1[n])
neufs = sorted(n for n in H1 if n not in H0)
disparus = sorted(n for n in H0 if n not in H1)
print(f"  inchangés (blob identique) : {len(inchanges)} · changés : {changes} · neufs : {neufs} · disparus : {disparus}")
ok = len(H0) == 32 and len(H1) == 34 and not disparus

# calibration deux bras de la règle de reprise
regle = lambda n: n in H0 and n in H1 and H0[n] == H1[n]
bras = [("positif — act-plafonds (changé à D325/D326) est REFUSÉ", regle("act-plafonds") is False),
        ("négatif — argon2 (inchangé) est ACCEPTÉ", regle("argon2") is True)]
for nom, b in bras:
    print(f"  {'✓' if b else '✗'} calibration : {nom}")
ok = ok and all(b for _, b in bras)

P0 = {}
for l in open("docs/preuves/D324/plancher/plancher.txt", encoding="utf-8"):
    if l.startswith("P "):
        _, nom, mode, p = l.split()
        P0[nom] = (mode, float(p))
print(f"planchers de D324 lus : {len(P0)} (attendu 28)")
ok = ok and len(P0) == 28

T = {}
chemin_sim = os.path.join(ICI, "simulation-sortie.txt")
if os.path.isfile(chemin_sim):
    for l in open(chemin_sim, encoding="utf-8"):
        if l.startswith("T "):
            _, nom, mode, n, ta, tb, tmax, _m = l.split()
            T[nom] = (mode, int(n), float(tmax))
print(f"non-démarrages MESURÉS à D329 lus : {len(T)} → {sorted(T)} (attendu 4 : act-plafonds, horloge, r32, r33)")
ok = ok and sorted(T) == ["act-plafonds", "horloge", "r32", "r33"]

# 4. le reste de neutralisation/
autres = sorted(c for c in set(b0) | set(b1) if not nom_de(c) and b0.get(c) != b1.get(c))
print(f"pièces de `neutralisation/` AUTRES que les harnais, changées depuis {D324} : {len(autres)} (attendu 0) {autres}")
ok = ok and not autres

# 5. les harnais LUS inchangés
lus_changes = sorted(n for n in LUS if not regle(n))
print(f"harnais LUS (preuve lue, hors plancher) : {sorted(LUS)} · changés depuis {D324} : {lus_changes} (attendu [])")
ok = ok and not lus_changes

# 2-3. composition
final = {}
for nom in sorted(H1):
    if nom in LUS:
        continue
    if nom in T:                                   # mesuré à D329
        mode, n, tmax = T[nom]
        final[nom] = (mode, round(K * tmax, 2), "MESURÉ à D329")
    elif regle(nom):                               # repris de D324, blob identique
        if nom not in P0:
            print(f"  ✗ {nom} : inchangé mais SANS plancher à D324")
            ok = False
            continue
        final[nom] = (P0[nom][0], P0[nom][1], "REPRIS de D324 (blob identique)")
    else:
        print(f"  ✗ {nom} : changé ou neuf, et NON mesuré à D329 — aucun plancher ne peut lui être donné")
        ok = False
attendus = sorted(n for n in H1 if n not in LUS)
print(f"planchers composés : {len(final)} (attendu {len(attendus)} = 34 − 4 lus) · mesurés {sum(1 for v in final.values() if v[2].startswith('MESURÉ'))} (attendu 4) · repris {sum(1 for v in final.values() if v[2].startswith('REPRIS'))} (attendu 26)")
ok = ok and sorted(final) == attendus and len(final) == 30
for nom in sorted(final):
    mode, p, d = final[nom]
    print(f"  {nom:16s} {mode:5s} P {p:6.2f} s · {d}")
if not ok:
    print("✗ ABANDON : plancher.txt n'est PAS écrit.")
    sys.exit(2)
lignes = [f"# D329 — plancher de durée par campagne, P = {K} × T. 26 REPRIS de D324 (blob du harnais identique à `{D324}` et à HEAD), 4 MESURÉS à D329 (act-plafonds, horloge, r32, r33).",
          "# Format : P <harnais> <passe qui certifie> <plancher en secondes>. Écrit par deriver-plancher.py ; lu par docs/preuves/D329/outils/lire-campagnes.py. Commité AVANT toute mesure de la passe."]
for nom in sorted(final):
    mode, p, _ = final[nom]
    lignes.append(f"P {nom} {mode} {p}")
open(os.path.join(ICI, "plancher.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
print(f"plancher.txt écrit : {len(lignes) - 2} lignes P (attendu 30)")
