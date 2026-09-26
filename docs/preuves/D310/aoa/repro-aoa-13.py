"""D310 — REPRODUCTION, SANS AUCUNE MUTATION, des 13 appels de mesure de `neutralisation/neutralize-available-on-api.py`
(boucle l. 210-240 : `subprocess.run([_binaire("apps/api/node_modules/.bin/vitest"), "run", fichier, "-t", filtre],
cwd="apps/api", …)`, sortie capturée et JAMAIS imprimée ; tout code non nul est compté « ROUGE »).
Cibles lues par l'ARBRE SYNTAXIQUE du harnais (rien n'en est exécuté). Deux bras, sur le MÊME arbre, NON muté :
  (a) l'appel TEL QUE LE HARNAIS LE FAIT — un test sain devrait rendre 0 ;
  (b) le même appel avec le binaire résolu en chemin ABSOLU — ce que la mesure rendrait si elle démarrait.
N'écrit rien dans le dépôt ; imprime le code, la durée et la première ligne de sortie de chaque appel.
Usage, depuis la racine :  python docs/preuves/D310/aoa/repro-aoa-13.py
"""
import ast, os, re, shutil, subprocess, sys, time
sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
src = open("neutralisation/neutralize-available-on-api.py", encoding="utf-8").read()
t = ast.parse(src)
cibles = next(n.value for n in t.body if isinstance(n, ast.Assign) and any(getattr(x, "id", "") == "CIBLES" for x in n.targets))
ENV = ast.literal_eval(next(n.value for n in t.body if isinstance(n, ast.Assign) and any(getattr(x, "id", "") == "ENV" for x in n.targets)))
rel = shutil.which("apps/api/node_modules/.bin/vitest") or "apps/api/node_modules/.bin/vitest"
absolu = os.path.abspath(rel)
print(f"binaire du harnais : {rel!r} (absolu : {os.path.isabs(rel)}) · cwd de la mesure : apps/api")
print(f"cibles parcourues : {len(cibles.elts)} (déclarées au harnais)")
bilan = {"a": [], "b": []}
for e in cibles.elts:
    libelle, chemin, avant, apres, attendu, filtre, fichier = [ast.literal_eval(x) for x in e.elts]
    ident = libelle.split(".")[0]
    for bras, binaire in (("a", rel), ("b", absolu)):
        t0 = time.time()
        r = subprocess.run([binaire, "run", fichier, "-t", filtre], cwd="apps/api", capture_output=True, text=True,
                           encoding="utf-8", errors="replace", env={**os.environ, **ENV})
        # ⚠ FAUTE DE LA PREMIÈRE VERSION, corrigée et rejouée (D298) : la ligne « Tests » était cherchée dans la
        #   sortie AVEC codes ANSI, donc jamais trouvée — et `vitest -t` sort en 0 quand AUCUN test ne correspond
        #   (D144) : un code 0 seul ne prouve pas que des tests ont tourné. On lit le compte, ANSI retiré.
        sortie = [re.sub(r"\[[0-9;]*m", "", l) for l in (r.stdout + r.stderr).splitlines() if l.strip()]
        tests = [l.strip() for l in sortie if l.strip().startswith("Tests")]
        premiere = sortie[0][:90] if sortie else "(aucune sortie)"
        bilan[bras].append(r.returncode)
        m = re.search(r"Tests\s+(?:(\d+) failed \| )?(?:(\d+) passed)?.*?\((\d+)\)", tests[-1]) if tests else None
        bilan[bras + '_tests'] = bilan.get(bras + '_tests', 0) + (int(m.group(2) or 0) if m else 0)
        print(f"  {ident:4s} ({bras}) code {r.returncode} en {time.time()-t0:5.2f} s · "
              f"{tests[-1] if tests else premiere}")
print(f"\n(a) TEL QUE LE HARNAIS : codes non nuls {sum(c != 0 for c in bilan['a'])} sur {len(bilan['a'])} "
      f"— chacun serait compté « ROUGE » s'il suivait une mutation")
print(f"(b) BINAIRE ABSOLU      : codes nuls {sum(c == 0 for c in bilan['b'])} sur {len(bilan['b'])} "
      f"— la mesure démarre et ses tests passent sur l'arbre non muté")
print(f"    tests PASSÉS relevés sur les lignes « Tests » : (a) {bilan.get('a_tests', 0)} · (b) {bilan.get('b_tests', 0)} "
      f"(attendu (a) 0, (b) ≥ 13 : au moins un test par filtre)")
