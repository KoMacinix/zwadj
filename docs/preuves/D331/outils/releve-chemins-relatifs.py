"""D331 — RELEVÉ DES CHEMINS RELATIFS AU PAQUET DANS LES CAMPAGNES DE NEUTRALISATION. Pièce versée, procédure archivée comme PREUVE (D291), jamais promue en instrument.

POURQUOI IL EXISTE. `neutralisation/lancer-campagnes.py` choisit les campagnes à rejouer en croisant `git diff --name-only HEAD` avec les chemins entre guillemets que lit chaque campagne ET QUI EXISTENT
  À LA RACINE (`os.path.isfile(c)`). Une campagne qui déclare une mesure `_vitest("@zwadj/pro", "src/venues/create-venue-page.test.tsx")` désigne un chemin RELATIF AU PAQUET : il n'existe pas à la racine,
  le tri l'ignore, et réécrire ce test ne fait pas retenir la campagne. C'est ce qui est arrivé à `neutralize-r33.py` (rang 37, extension 4 de la table) : une cible attendait un titre qui ne rougissait plus,
  et une vérification MANUELLE l'a vu. Ce relevé dit l'ÉTENDUE : combien de campagnes déclarent au moins un tel chemin. Il ne modifie ni le tri ni aucune campagne.
INSTRUMENTS ÉCARTÉS : relever « les campagnes qui contiennent `_vitest(` » (compte une écriture, pas un chemin) ; lire `lancer-campagnes.py --liste` (il ne dit que ce qu'il retient, pas ce qu'il manque).
LECTURE : une campagne est RELATIVE si au moins un chemin entre guillemets d'extension `ts`/`tsx`/`css`/`json`/`sql`/`mjs` (les mêmes que le tri) n'existe PAS à la racine et existe sous un paquet de `apps/` ou `packages/`.
  ⚠ C'est un compte de CHEMINS DÉCLARÉS, pas de tests manqués : un chemin relatif peut désigner un fichier muté (le tri le manque aussi) ou un fichier de mesure.
CALIBRATION, deux bras, REJOUÉE à chaque lancement, abandon si un seul manque : (positif) le texte d'une mesure `_vitest("@zwadj/pro", "src/venues/create-venue-page.test.tsx")` rend 1 chemin relatif, et le fichier
  réel `neutralisation/neutralize-r33.py` en rend au moins 1 ; (négatif) le même chemin écrit depuis la RACINE (`apps/pro/src/venues/create-venue-page.test.tsx`) rend 0, et un chemin qui n'existe nulle part rend 0.
Usage, depuis la racine (bash, jamais une redirection PowerShell 5.1 : UTF-16, D298) : python3 docs/preuves/D331/outils/releve-chemins-relatifs.py > docs/preuves/D331/releve-chemins-relatifs.txt
"""
import glob
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")

CHEMIN = re.compile(r"""['"]([^'"\n]+\.(?:ts|tsx|css|json|sql|mjs))['"]""")  # la même expression que `lancer-campagnes.py`
PAQUETS = [d for d in sorted(glob.glob("apps/*") + glob.glob("packages/*")) if os.path.isdir(d)]


def relatifs(source: str) -> list:
    return sorted({c for c in CHEMIN.findall(source) if not os.path.isfile(c) and any(os.path.isfile(os.path.join(p, c)) for p in PAQUETS)})


reel = open("neutralisation/neutralize-r33.py", encoding="utf-8").read()
cal = [
    ("positif : une mesure `_vitest(\"@zwadj/pro\", \"src/venues/create-venue-page.test.tsx\")` rend 1 chemin relatif", relatifs('_vitest("@zwadj/pro", "src/venues/create-venue-page.test.tsx")') == ["src/venues/create-venue-page.test.tsx"]),
    ("positif : `neutralisation/neutralize-r33.py` (le cas connu) en rend au moins 1", len(relatifs(reel)) >= 1),
    ("négatif : le même chemin écrit depuis la RACINE rend 0", relatifs('"apps/pro/src/venues/create-venue-page.test.tsx"') == []),
    ("négatif : un chemin qui n'existe nulle part rend 0", relatifs('"src/zzz-n-existe-pas/zzz.test.tsx"') == []),
]
for nom, ok in cal:
    print(f"   {'✓' if ok else '✗'} calibration — {nom}")
if not all(ok for _, ok in cal):
    sys.exit("✗ ABANDON : calibration manquée")
print(f"   calibration : {len(cal)} bras, 0 manqué")

campagnes = sorted(glob.glob("neutralisation/neutralize-*.py"))
rel = []
total_chemins = 0
for s in campagnes:
    src = open(s, encoding="utf-8").read()
    total_chemins += len(set(CHEMIN.findall(src)))
    r = relatifs(src)
    if r:
        rel.append((os.path.basename(s), r))
print(f"parcouru : {len(campagnes)} campagne(s) (attendu : autant que de `neutralisation/neutralize-*.py`, soit {len(glob.glob('neutralisation/neutralize-*.py'))}) ; {total_chemins} chemin(s) entre guillemets lus ; {len(PAQUETS)} paquet(s) cherchés")
print(f"RÉSULTAT : {len(rel)} campagne(s) sur {len(campagnes)} déclarent au moins un chemin relatif au paquet ; {len(campagnes) - len(rel)} n'en déclarent aucun")
for nom, r in rel:
    print(f"  {nom} : {len(r)} chemin(s)")
print("sans aucun chemin relatif : " + ", ".join(os.path.basename(s) for s in campagnes if os.path.basename(s) not in {n for n, _ in rel}))
