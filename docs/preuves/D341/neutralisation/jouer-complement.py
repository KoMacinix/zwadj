"""D341 — JOUE LE COMPLÉMENT DE L'UNION (COPIE de `jouer-union.py` de D341 ; seuls la liste lue, le dossier des journaux et les campagnes jouées avec `--int` changent). Le complément est la liste des campagnes que le tri de `lancer-campagnes.py` ne voit pas (son angle mort : un chemin de test écrit RELATIVEMENT à `apps/api`), calculée par `calculer-complement.py` et versée AVANT d'être jouée.

Lit la dernière ligne `UNION: …` de `docs/preuves/D341/neutralisation/union-sortie.txt` — la liste CALCULÉE et VERSÉE avant de jouer (`calculer-union.py`) — et joue chaque campagne EN SÉRIE (chacune MUTE des fichiers
sources partagés : deux campagnes concurrentes se marcheraient dessus). Les verdicts se COMPTENT sur les lignes de sortie, comme `lancer-campagnes.py` (D269 : un script arrêté en cours n'écrit aucun résumé).
Les campagnes qui ont des cibles d'intégration (`r41`, `r42`, `r43`, `s11b` ; `r4` est entièrement d'intégration et n'a pas de drapeau) ne sont jouées QU'UNE fois, avec `--int` : la passe `--int` contient toutes leurs cibles unitaires ; les jouer sans PUIS avec compterait deux
fois les mêmes gardes (N-C1 de la lecture adverse de D332).
Chaque sortie ENTIÈRE est journalisée sous `.neutralisation-journaux/d341-union/` (ignoré par git) ; ce que la décision cite est COPIÉ ensuite sous `docs/preuves/D341/neutralisation/`.

Imprime, pour chaque campagne, ce qu'elle a PARCOURU et l'attendu à côté (D290) : cibles mordues / muettes / non mesurées, et le résumé du harnais quand il en écrit un.
Codes : 0 = tout joué ET tout mordu ; 1 = une garde muette ou une campagne non mesurée ; 2 = la liste est introuvable, vide, ou nomme une campagne absente.
Usage, depuis la racine, bash : python3 docs/preuves/D341/neutralisation/jouer-complement.py [--seulement nom.py,nom2.py]
"""
import io
import os
import re
import subprocess
import sys
import time

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")

SORTIE_UNION = "docs/preuves/D341/neutralisation/complement-sortie.txt"
JOURNAUX = os.path.join(".neutralisation-journaux", "d341-complement")
MORDUES = re.compile(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible")
ROUGES = re.compile(r"(\d+) garde\(s\) neutralis..e\(s\) et ROUGE\(s\)")
AVEC_INT = ("neutralize-r41.py", "neutralize-r42.py", "neutralize-r43.py", "neutralize-s11b.py")

lignes = [l for l in io.open(SORTIE_UNION, encoding="utf-8").read().splitlines() if l.startswith("UNION: ")]
if len(lignes) != 1:
    sys.exit(f"✗ {SORTIE_UNION} : {len(lignes)} ligne(s) « UNION: » (une exigée)")
noms = [n for n in lignes[0][len("UNION: "):].split(",") if n]
filtre = None
if "--seulement" in sys.argv:
    filtre = sys.argv[sys.argv.index("--seulement") + 1].split(",")
absentes = [n for n in noms if not os.path.isfile(os.path.join("neutralisation", n))]
if not noms or absentes:
    sys.exit(f"✗ liste vide ou campagne(s) absente(s) : {absentes}")
jouees = [n for n in noms if filtre is None or n in filtre]
print(f"liste versée : {len(noms)} campagne(s) · jouées dans ce lancement : {len(jouees)}" + ("" if filtre is None else f" (FILTRE {filtre} : un lancement filtré n'est pas la passe)"))

os.makedirs(JOURNAUX, exist_ok=True)
rapport = []
t0 = time.time()
for n in jouees:
    passages = [("--int", [sys.executable, os.path.join("neutralisation", n), "--int"])] if n in AVEC_INT else [("", [sys.executable, os.path.join("neutralisation", n)])]
    for suffixe, cmd in passages:
        etiquette = n + (f" {suffixe}" if suffixe else "")
        debut = time.time()
        print(f"\n[{len(rapport) + 1}] {etiquette} …", flush=True)
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", env={**os.environ, "PYTHONIOENCODING": "utf-8"})
        sortie = f"{r.stdout or ''}\n{r.stderr or ''}"
        io.open(os.path.join(JOURNAUX, n + (".int" if suffixe else "") + ".log"), "w", encoding="utf-8", newline="").write(sortie)
        l = sortie.splitlines()
        mordues = len([x for x in l if x.startswith("✓ ") and "vol" not in x and "calibration" not in x])
        muettes = len([x for x in l if x.startswith("✗ ")])
        non_mes = len([x for x in l if "NON MESUR" in x and ":" in x])
        m = MORDUES.search(sortie) or ROUGES.search(sortie)
        resume = m.group(0) if m else "— (aucun résumé écrit)"
        rapport.append((etiquette, r.returncode, mordues, muettes, non_mes, resume, round(time.time() - debut)))
        print(f"    sortie={r.returncode} · {mordues} mordue(s), {muettes} muette(s)/erreur(s), {non_mes} non mesurée(s) · {resume}", flush=True)

print("\n" + "=" * 120)
print(f"{'campagne':34s} {'sortie':>6s} {'mord':>5s} {'muet':>5s} {'nonm':>5s} {'sec':>5s}  résumé du harnais")
for etiquette, code, mord, muet, nonm, resume, sec in rapport:
    print(f"{etiquette:34s} {code:>6d} {mord:>5d} {muet:>5d} {nonm:>5d} {sec:>5d}  {resume}")
print("=" * 120)
print(f"PARCOURU : {len(rapport)} passage(s) pour {len(jouees)} campagne(s) (attendu : autant que de campagnes ; `r33`, `r39` et `r44` sont jouées UNE fois, avec --int) · {round(time.time() - t0)}s")
fautives = [(e, c) for e, c, *_ in rapport if c != 0]
print(f"MESURÉ : {sum(r[2] for r in rapport)} garde(s) mordue(s) · {sum(r[3] for r in rapport)} muette(s)/erreur(s) · {sum(r[4] for r in rapport)} non mesurée(s) · {len(fautives)} sortie(s) non nulle(s) (attendu : 0, 0, 0)")
for e, c in fautives:
    print(f"  ⚠ {e} → sortie {c}")
sys.exit(1 if fautives or any(r[3] or r[4] for r in rapport) else 0)
