"""D312 — LECTURE des journaux du harnais corrigé, INDÉPENDANTE de son lecteur (aucun import du harnais : les
cibles sont lues par l'ARBRE SYNTAXIQUE, rien n'en est exécuté). Pièce jetable, versée.
Pour chaque cible : la ligne « Tests » du journal, TOUS les blocs « FAIL … > titre » et la première ligne de chacun ;
exigé : exécutés > 0, en échec > 0, chaque bloc en `AssertionError`, chaque titre en échec portant le filtre `-t` de la
cible (casse ignorée), code de sortie non nul. Pour la calibration et le pré-vol : l'état attendu de chaque journal.
Imprime l'attendu à côté du mesuré (D290) et ce qu'il a parcouru.
Usage, depuis la racine :  python docs/preuves/D312/campagne/lire-journaux.py <dossier des journaux>
"""
import ast
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml") or len(sys.argv) != 2:
    sys.exit(__doc__)
J = sys.argv[1]
src = open("neutralisation/neutralize-available-on-api.py", encoding="utf-8").read()
arbre = ast.parse(src)
cibles = ast.literal_eval(next(n.value for n in arbre.body if isinstance(n, ast.Assign)
                               and any(getattr(x, "id", "") == "CIBLES" for x in n.targets)))


def lire(chemin):
    t = open(chemin, encoding="utf-8").read()
    res = re.findall(r"^\s*Tests\s+(.+?)\s*$", t, re.M)
    code = re.search(r"--- code de sortie : (\S+) ---\s*$", t)
    n = lambda mot: int(m.group(1)) if res and (m := re.search(rf"(\d+) {mot}\b", res[-1])) else 0
    lignes = t.splitlines()
    blocs = []
    for i, l in enumerate(lignes):
        m = re.match(r"^\s*FAIL\s+\S+\s+>\s+(.+?)\s*$", l)
        if m:
            blocs.append((m.group(1), next((x.strip() for x in lignes[i + 1:i + 8] if x.strip()), "")))
    return (res[-1] if res else None), (code.group(1) if code else None), n("failed"), n("passed"), blocs, len(lignes)


ecarts, parcourus = 0, 0
print(f"cibles lues dans le harnais : {len(cibles)} (attendu 13)")
for c in cibles:
    ident = c[0].split(".")[0]
    filtre = c[5]
    chemin = os.path.join(J, f"{ident}.txt")
    resume, code, echecs, passes, blocs, nl = lire(chemin)
    parcourus += nl
    types = sorted({p.split(":")[0] for _, p in blocs})
    filtres_ok = all(filtre.lower() in titre.lower() for titre, _ in blocs)
    ok = (passes + echecs) > 0 and echecs > 0 and code not in ("0", "None", None) and blocs \
        and types == ["AssertionError"] and len(blocs) == echecs and filtres_ok
    ecarts += not ok
    print(f"{'✓' if ok else '✗'} {ident:4s} code {code} · exécutés {passes + echecs} · en échec {echecs} · blocs lus "
          f"{len(blocs)} (attendu {echecs}) · types {types} (attendu ['AssertionError']) · titres portant « {filtre} » : "
          f"{filtres_ok} · {nl} lignes")
    for titre, premiere in blocs:
        print(f"       « {titre[-110:]} »\n         {premiere[:150]}")
print("\n== calibration et pré-vol")
attendus = {"calibration-1-defaut-d310.txt": "NON DÉMARRÉE", "calibration-2-commande-introuvable.txt": "NON DÉMARRÉE",
            "calibration-3-filtre-sans-titre.txt": "NON DÉMARRÉE", "calibration-4-mutation-connue.txt": "MORDUE",
            "calibration-5-mutation-neutre.txt": "VERTE"}
prevols = sorted(n for n in os.listdir(J) if n.startswith("pre-vol-"))
for n in prevols:
    attendus[n] = "VERTE"
for n, att in attendus.items():
    resume, code, echecs, passes, blocs, nl = lire(os.path.join(J, n))
    parcourus += nl
    if resume is None or passes + echecs == 0:
        etat = "NON DÉMARRÉE"
    elif echecs and blocs and code not in ("0", "None"):
        etat = "MORDUE"
    elif echecs == 0 and code == "0":
        etat = "VERTE"
    else:
        etat = "PANNE"
    ecarts += etat != att
    print(f"{'✓' if etat == att else '✗'} {n:42s} {etat} (attendu {att}) · code {code} · « {resume} »")
print(f"\njournaux lus : {len(cibles) + len(attendus)} (attendu {13 + 5 + len(prevols)}) · pré-vol {len(prevols)} "
      f"(attendu 12 : A8 et A9 partagent leur mesure) · lignes parcourues {parcourus} · écarts {ecarts} (attendu 0)")
sys.exit(1 if ecarts else 0)
