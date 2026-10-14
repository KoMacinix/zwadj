"""D332 — L'UNION DES CAMPAGNES À REJOUER (décision 1 du relecteur, 14/10/2026). Pièce versée, procédure archivée comme PREUVE (D291), jamais promue en instrument.

CE QU'ELLE CALCULE, mot pour mot de la décision 1 : « Rejouer l'UNION de : (a) ce que retient `lancer-campagnes.py` ; (b) toute campagne dont un harnais cite, MÊME RELATIVEMENT À SON PAQUET, un fichier
du diff (comparaison par chemin relatif au paquet ET par nom de fichier). Le calcul de (b) est un script calibré à deux bras, VERSÉ AVEC SA SORTIE AVANT DE JOUER LES CAMPAGNES. »

POURQUOI ELLE EXISTE. `lancer-campagnes.py` croise `git diff --name-only HEAD` avec les chemins entre guillemets d'une campagne QUI EXISTENT À LA RACINE (`os.path.isfile`). D331 a mesuré que 30 campagnes sur 35
déclarent au moins un chemin RELATIF À LEUR PAQUET (`_vitest("@zwadj/pro", "src/venues/x.test.tsx")`) : le tri ne les voit pas. ⚠ Autre trou, propre à ce lot et MESURÉ à la rédaction : le tri compare à
`HEAD`. Dès que le code du lot est COMMITÉ, `git diff HEAD` ne contient plus rien et le tri ne retient AUCUNE campagne. (a) est donc calculé ici avec les MÊMES fonctions que le tri (`campagnes`,
`fichiers_lus`, importées de `lancer-campagnes.py`, pas recopiées), appliquées au diff du LOT — de son SHA de départ à l'arbre de travail, fichiers non suivis compris — et le tri tel qu'il est lancé
(contre `HEAD`) est rapporté À CÔTÉ, pour que l'écart se voie.

LES TROIS CRITÈRES DE (b), chacun rapporté SÉPARÉMENT (un critère faible — le nom — ne se fond pas dans un critère fort sans qu'on le voie) :
  R  le chemin cité EST un fichier du diff (chemin depuis la racine) ;
  P  le chemin cité, préfixé d'un dossier, EST un fichier du diff (chemin relatif au paquet : `src/venues/x.tsx` ↔ `apps/pro/src/venues/x.tsx`) ;
  N  le NOM du fichier cité est celui d'un fichier du diff (un nom commun — `index.ts`, `fr.json` — retient par excès : c'est le sens voulu, on rejoue plus, jamais moins).
Le texte cherché est celui des chaînes entre guillemets du harnais : `['"]chemin.ext['"]`, toute extension. ⚠ LIMITE ÉCRITE : un chemin ASSEMBLÉ à l'exécution (`os.path.join`, f-string) n'est pas une chaîne
littérale et n'est pas vu ; aucune campagne n'a été trouvée qui n'écrive son fichier muté qu'ainsi (les 35 campagnes lues déclarent au moins un chemin), mais la preuve de l'absence n'est pas faite.

CALIBRATION, deux bras par critère, rejouée à chaque lancement, abandon si un seul manque (D286) : (positifs) R, P et N retiennent un texte de campagne synthétique ; le cas CONNU — `neutralize-r37.py`
cite `src/venues/ma-salle-relecture.test.tsx` (relatif au paquet) : le tri (a) NE le retient PAS pour ce fichier modifié, (b) le retient ; (négatifs) un chemin qui ne désigne aucun fichier du diff, et un
nom de fichier absent du diff, ne retiennent rien. Imprime ce qu'il a PARCOURU et l'attendu à côté (D290).
Usage, depuis la racine, bash (jamais une redirection PowerShell, D298) : python3 docs/preuves/D332/neutralisation/union-campagnes.py [SHA de départ, défaut dd41fbd] > docs/preuves/D332/neutralisation/union-sortie.txt
La dernière ligne `UNION: …` est ce que lit `jouer-union.py`.
"""
import glob
import importlib.util
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")

DEPART = sys.argv[1] if len(sys.argv) > 1 else "dd41fbd"
CHEMIN = re.compile(r"""['"]([^'"\s]+\.[A-Za-z0-9]{1,5})['"]""")

spec = importlib.util.spec_from_file_location("lancer_campagnes", "neutralisation/lancer-campagnes.py")
lancer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lancer)


def git(*args: str) -> list[str]:
    r = subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        sys.exit(f"✗ git {' '.join(args)} : {r.stderr.strip()}")
    return [l.strip().replace("\\", "/") for l in r.stdout.splitlines() if l.strip()]


def diff_du_lot(depart: str) -> set[str]:
    """Du SHA de départ à l'arbre de travail (commits, modifications, non suivis). `docs/preuves/` ne compte pas : aucune porte ne le lit (AGENTS.md, D292)."""
    fichiers = set(git("diff", "--name-only", depart)) | set(git("ls-files", "--others", "--exclude-standard"))
    return {f for f in fichiers if not f.startswith("docs/preuves/")}


def criteres(texte: str, diff: set[str]) -> dict[str, set[str]]:
    """{critère: {fichiers du diff retenus}} pour un texte de campagne."""
    noms = {}
    for f in diff:
        noms.setdefault(os.path.basename(f), set()).add(f)
    r: dict[str, set[str]] = {"R": set(), "P": set(), "N": set()}
    for c in set(CHEMIN.findall(texte)):
        c = c.replace("\\", "/")
        if c in diff:
            r["R"].add(c)
        r["P"] |= {f for f in diff if f != c and f.endswith("/" + c)}
        r["N"] |= noms.get(os.path.basename(c), set())
    return r


# ── CALIBRATION
D = {"apps/pro/src/venues/x.tsx", "apps/api/src/documents/y.ts"}
r37 = open("neutralisation/neutralize-r37.py", encoding="utf-8").read()
cas_connu = {"apps/pro/src/venues/ma-salle-relecture.test.tsx"}
tri_a_voit_connu = [p for p in lancer.campagnes() if lancer.fichiers_lus(p) & cas_connu]
cal = [
    ("positif R : un chemin depuis la racine retient le fichier du diff", criteres('"apps/pro/src/venues/x.tsx"', D)["R"] == {"apps/pro/src/venues/x.tsx"}),
    ("positif P : un chemin relatif au paquet retient le fichier du diff", criteres('_vitest("@zwadj/pro", "src/venues/x.tsx")', D)["P"] == {"apps/pro/src/venues/x.tsx"}),
    ("positif N : le seul nom du fichier retient le fichier du diff", criteres('"x.tsx"', D)["N"] == {"apps/pro/src/venues/x.tsx"}),
    ("positif, cas CONNU : `neutralize-r37.py` cite `src/venues/ma-salle-relecture.test.tsx` — (b) le retient pour ce fichier modifié", bool(criteres(r37, cas_connu)["P"])),
    ("positif, cas CONNU : le tri (a) ne retient AUCUNE campagne pour ce même fichier (l'angle mort que l'union couvre)", tri_a_voit_connu == []),
    ("négatif : un chemin qui ne désigne aucun fichier du diff ne retient rien, ni par R ni par P ni par N", all(not v for v in criteres('"src/venues/autre.tsx"', D).values())),
    ("négatif : un nom absent du diff ne retient rien, ni par R ni par P ni par N", all(not v for v in criteres('"zzz-absent.tsx" "apps/zzz/absent.ts"', D).values())),
]
for nom, ok in cal:
    print(f"   {'✓' if ok else '✗'} calibration — {nom}")
if not all(ok for _, ok in cal):
    sys.exit("✗ ABANDON : calibration manquée")
print(f"   calibration : {len(cal)} bras, 0 manqué")

# ── CALCUL
diff = diff_du_lot(DEPART)
campagnes = lancer.campagnes()
attendues = len(glob.glob("neutralisation/neutralize-*.py"))
print(f"départ : {DEPART} ({git('rev-parse', DEPART)[0][:12]}) · HEAD {git('rev-parse', 'HEAD')[0][:12]}")
print(f"parcouru : {len(campagnes)} campagne(s) (attendu : autant que de `neutralisation/neutralize-*.py`, soit {attendues}) ; {len(diff)} fichier(s) dans le diff du lot (hors `docs/preuves/`)")
for f in sorted(diff):
    print(f"   diff · {f}")

a_lot = {p for p in campagnes if lancer.fichiers_lus(p) & diff}
head = lancer.modifies()
a_tri = {p for p in campagnes if lancer.fichiers_lus(p) & head}
print(f"(a) retenues par les fonctions du tri sur le diff DU LOT : {len(a_lot)} · le tri tel que lancé (contre HEAD, {len(head)} fichier(s) modifié(s) depuis HEAD) : {len(a_tri)}")

par = {}
for p in campagnes:
    par[p] = criteres(open(p, encoding="utf-8").read(), diff)
b = {p for p, c in par.items() if any(c.values())}
union = sorted(a_lot | b)
print(f"(b) campagnes qui citent un fichier du diff : {len(b)} — R {sum(1 for c in par.values() if c['R'])} · P {sum(1 for c in par.values() if c['P'])} · N {sum(1 for c in par.values() if c['N'])}")
print()
print(f"{'campagne':36s} {'(a)':>4s} {'R':>3s} {'P':>3s} {'N':>3s}  fichiers du diff cités")
for p in campagnes:
    c = par[p]
    cites = sorted(c["R"] | c["P"] | c["N"])
    if p in a_lot or cites:
        print(f"{os.path.basename(p):36s} {'oui' if p in a_lot else '—':>4s} {len(c['R']):>3d} {len(c['P']):>3d} {len(c['N']):>3d}  {', '.join(cites)[:140]}")
hors = [os.path.basename(p) for p in campagnes if p not in union]
print()
print(f"UNION : {len(union)} campagne(s) sur {len(campagnes)} ; (a) seul en aurait retenu {len(a_lot)} ; le tri tel que lancé en retient {len(a_tri)} ; (b) ajoute {len(set(union) - a_lot)}")
print(f"non retenues : {', '.join(hors) if hors else '—'}")
print("UNION: " + ",".join(os.path.basename(p) for p in union))
