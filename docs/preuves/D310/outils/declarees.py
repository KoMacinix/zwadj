"""D310 — ÉNUMÉRATION DES HARNAIS AVANT LA CERTIFICATION DU RANG 23, par l'ARBRE SYNTAXIQUE, sans RIEN exécuter.
Procédure archivée comme preuve (D291), jamais promue en instrument. N'écrit rien : elle imprime.
Usage, depuis la racine :  python docs/preuves/D310/outils/declarees.py

⛔ POURQUOI L'AST ET PAS UN IMPORT (faute de D310, écrite dans sa section) : `neutralize-act-plafonds.py`,
`-argon2.py` et `-horloge.py` n'ont pas de garde `__main__` — les IMPORTER pour compter leurs cibles EXÉCUTE leur
campagne (mutations de sources, tests). Un import l'a fait, hors de toute fenêtre de mesure, arbre restauré. Ici le
source est LU et analysé ; aucune ligne de harnais ne s'exécute.

POUR CHAQUE `neutralisation/neutralize-*.py` (motif de `lancer-campagnes.py`, D272) :
  - CIBLES DÉCLARÉES : le nombre d'éléments de la liste littérale `CIBLES` au niveau du module ;
  - MESURES d'INTÉGRATION : une mesure est d'intégration si son genre vaut « int », si son nom commence par « int- »,
    ou si sa commande nomme une `*.int-spec.ts` ou `vitest.config.int` ;
  - VERROUILLÉE par `--int` : le source porte `"--int" in argv` (sans lui, ses mesures d'intégration ne tournent pas) ;
  - par cible (harnais à mesures d'intégration seulement) : la liste littérale des mesures déclarées — ce que la ligne
    de verdict doit porter entre crochets quand toutes ont été jouées ;
  - CHEMIN DE L'ARGENT : lu dans la pièce datée `docs/preuves/D307/carte/tri.txt` (dernière section), jamais recopié.
⇒ PRÉDICTION : la passe qui CERTIFIE chaque harnais (`--int` s'il est verrouillé, `--tout` sinon — exigence de Ko,
26/09/2026 : « tout harnais qui a des cibles d'intégration se joue AUSSI en --int ») et le total déclaré.
Calibration à deux bras (D286) : un harnais connu verrouillé (`solid-s1`, 2 cibles, 2 mesures d'intégration) et un
harnais connu sans intégration (`s11a`, 18 cibles, section D307) — abandon si un bras manque.
"""
import ast
import glob
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)


def analyser(chemin: str) -> dict:
    src = open(chemin, encoding="utf-8").read()
    arbre = ast.parse(src)
    cibles, mesures = None, {}
    for noeud in arbre.body:
        if isinstance(noeud, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "CIBLES" for t in noeud.targets):
            cibles = noeud.value
        if isinstance(noeud, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "MESURES" for t in noeud.targets):
            if isinstance(noeud.value, ast.Dict):
                for k, v in zip(noeud.value.keys, noeud.value.values):
                    if isinstance(k, ast.Constant):
                        texte = ast.unparse(v)
                        genre = None
                        if isinstance(v, ast.Tuple) and len(v.elts) > 1 and isinstance(v.elts[1], ast.Constant):
                            genre = v.elts[1].value
                        est_int = (genre == "int" or str(k.value).startswith("int-")
                                   or bool(re.search(r"int-spec\.ts|vitest\.config\.int", texte)))
                        mesures[k.value] = est_int
    n = len(cibles.elts) if isinstance(cibles, (ast.List, ast.Tuple)) else None
    par_cible = []
    if isinstance(cibles, (ast.List, ast.Tuple)):
        for e in cibles.elts:
            if isinstance(e, ast.Tuple):
                libelle = e.elts[0].value if isinstance(e.elts[0], ast.Constant) else ast.unparse(e.elts[0])
                listes = [x for x in e.elts if isinstance(x, ast.List)
                          and all(isinstance(y, ast.Constant) and isinstance(y.value, str) for y in x.elts)
                          and all(y.value in mesures for y in x.elts) and x.elts]
                par_cible.append((libelle, [y.value for y in listes[0].elts] if listes else None))
    return {"n": n, "mesures": mesures, "verrou": '"--int" in argv' in src, "par_cible": par_cible}


tri = open("docs/preuves/D307/carte/tri.txt", encoding="utf-8").read()
m = re.search(r"HARNAIS DU CHEMIN DE L'ARGENT À HEAD \w+, carte de D304 \+ ce tri : (.*?)\. DEHORS", tri, re.S)
argent = set()
if m:
    # ⚠ Premier découpage FAUTIF, attrapé par la calibration ci-dessous (12 au lieu de 11 : un nom de fichier de la
    #   parenthèse était pris pour un harnais). Forme de la phrase : « a, b, …, j — et k (…) ».
    texte = re.sub(r"\s+", " ", m.group(1))
    avant_et, _, apres_et = texte.partition(" — et ")
    argent = {x.strip() for x in avant_et.split(",") if x.strip()}
    argent |= {apres_et.split(" ")[0].strip()} if apres_et else set()

harnais = sorted(glob.glob("neutralisation/neutralize-*.py"))
res = {os.path.basename(p)[11:-3]: analyser(p) for p in harnais}

print("== CALIBRATION, deux bras")
b1 = res.get("solid-s1", {})
b2 = res.get("s11a", {})
ok1 = b1.get("n") == 2 and b1.get("verrou") and sum(b1.get("mesures", {}).values()) == 2
ok2 = b2.get("n") == 18 and not b2.get("verrou") and sum(b2.get("mesures", {}).values()) == 0
print(f"  {'✓' if ok1 else '✗'} solid-s1 : {b1.get('n')} cibles (attendu 2), verrou {b1.get('verrou')} (attendu True), "
      f"mesures d'intégration {sum(b1.get('mesures', {}).values())} (attendu 2)")
print(f"  {'✓' if ok2 else '✗'} s11a : {b2.get('n')} cibles (attendu 18), verrou {b2.get('verrou')} (attendu False), "
      f"mesures d'intégration {sum(b2.get('mesures', {}).values())} (attendu 0)")
print(f"  chemin de l'argent lu dans la pièce de D307 : {len(argent)} harnais (attendu 11) : {sorted(argent)}")
if not (ok1 and ok2 and len(argent) == 11):
    print("✗ ABANDON — calibration manquée.")
    sys.exit(2)

print(f"\n== HARNAIS : {len(harnais)} fichiers `neutralize-*.py` parcourus")
print(f"{'harnais':20s} {'cibles':>6s}  {'int':>3s}  {'verrou':>6s}  {'passe qui certifie':18s}  argent")
total, total_int = 0, 0
a_int = []
for nom, r in res.items():
    nint = sum(r["mesures"].values())
    passe = "--int" if r["verrou"] else "--tout"
    if nint:
        a_int.append(nom)
    total += r["n"] or 0
    print(f"{nom:20s} {str(r['n']):>6s}  {nint:>3d}  {str(r['verrou']):>6s}  {passe:18s}  "
          f"{'OUI' if nom in argent else '—'}")
print(f"\nTOTAL DÉCLARÉ : {total} cibles sur {len(res)} harnais")
print(f"HARNAIS À MESURES D'INTÉGRATION : {len(a_int)} — {a_int}")
print(f"  dont VERROUILLÉS par --int (rejoués en --int) : {[n for n in a_int if res[n]['verrou']]}")
print(f"  dont SANS verrou (intégration jouée par --tout) : {[n for n in a_int if not res[n]['verrou']]}")
print(f"CHEMIN DE L'ARGENT : {sorted(argent)} — {sum(res[n]['n'] for n in argent if n in res)} cibles")

print("\n== MESURES DÉCLARÉES PAR CIBLE — harnais à mesures d'intégration (la ligne de verdict doit les porter toutes)")
for nom in a_int:
    r = res[nom]
    print(f"-- {nom} : mesures {r['mesures']}")
    for libelle, mes in r["par_cible"]:
        ident = str(libelle).split(".")[0].split(" ")[0]
        print(f"   {ident:12s} {mes}")
    sans = [l for l, mes in r["par_cible"] if mes is None]
    if sans:
        print(f"   ⚠ {len(sans)} cible(s) sans liste de mesures lisible")
