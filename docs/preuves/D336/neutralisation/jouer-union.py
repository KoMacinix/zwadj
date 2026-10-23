"""D336 — JOUE L'UNION DES CAMPAGNES (COPIE de celui de D333 ; seuls les chemins, le dossier des journaux et la liste des campagnes jouées avec `--int` changent ; décision 1 du relecteur, reprise comme patron). Pièce versée, procédure archivée comme PREUVE (D291), jamais promue en instrument.

Lit la dernière ligne `UNION: …` de `docs/preuves/D336/neutralisation/union-sortie.txt` — la liste CALCULÉE et VERSÉE avant de jouer — et joue chaque campagne EN SÉRIE (chacune MUTE des fichiers
sources partagés : deux campagnes concurrentes se marcheraient dessus). Les verdicts se COMPTENT sur les lignes de sortie, comme `lancer-campagnes.py` (D269 : un script arrêté en cours n'écrit aucun résumé).
`neutralize-r33.py` est joué DEUX fois — sans puis avec `--int` (PostgreSQL réel, le vrai Chromium) : ses cibles I-* et les mesures d'intégration des autres n'existent qu'avec `--int`.
Chaque sortie ENTIÈRE est journalisée sous `.neutralisation-journaux/d336-union/` (ignoré par git) ; ce que la décision cite est COPIÉ ensuite sous `docs/preuves/D336/neutralisation/`.

Imprime, pour chaque campagne, ce qu'elle a PARCOURU et l'attendu à côté (D290) : cibles déclarées / mordues / muettes / non mesurées, et le résumé du harnais quand il en écrit un.
Codes : 0 = tout joué ET tout mordu ; 1 = une garde muette ou une campagne non mesurée ; 2 = la liste est introuvable, vide, ou nomme une campagne absente.
Usage, depuis la racine, bash : python3 docs/preuves/D336/neutralisation/jouer-union.py [--seulement nom.py,nom2.py]
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

SORTIE_UNION = "docs/preuves/D336/neutralisation/union-sortie.txt"
JOURNAUX = os.path.join(".neutralisation-journaux", "d336-union")
MORDUES = re.compile(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible")
ROUGES = re.compile(r"(\d+) garde\(s\) neutralis..e\(s\) et ROUGE\(s\)")

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
    # ⚠ Rang 39 : `r33` et `r39` ne sont jouées qu'UNE fois, AVEC `--int` — la passe `--int` contient toutes leurs cibles unitaires ; les jouer sans PUIS avec compterait deux fois les mêmes
    # gardes (N-C1 de la lecture adverse de D332 : « 321 » additionnait 87 et 95 alors que les 87 sont des 95).
    # ⛔ Rang 41 (D336) : les SIX campagnes de l'union qui ont des cibles d'intégration (extensions 6 et 7 de la table : `e3d1-s8` est retenue par le nom de
    # fichier de la migration) — une fois chacune, avec `--int`.
    avec_int = n in ("neutralize-e3d1-s8.py", "neutralize-r33.py", "neutralize-r39.py", "neutralize-r41.py", "neutralize-s11b.py", "neutralize-solid-s3.py")
    passages = [("--int", [sys.executable, os.path.join("neutralisation", n), "--int"])] if avec_int else [("", [sys.executable, os.path.join("neutralisation", n)])]
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
print(f"PARCOURU : {len(rapport)} passage(s) pour {len(jouees)} campagne(s) (attendu : autant que de campagnes ; `r33` et `r39` sont jouées UNE fois, avec --int) · {round(time.time() - t0)}s")
fautives = [(e, c) for e, c, *_ in rapport if c != 0]
print(f"MESURÉ : {sum(r[2] for r in rapport)} garde(s) mordue(s) · {sum(r[3] for r in rapport)} muette(s)/erreur(s) · {sum(r[4] for r in rapport)} non mesurée(s) · {len(fautives)} sortie(s) non nulle(s) (attendu : 0, 0, 0)")
for e, c in fautives:
    print(f"  ⚠ {e} → sortie {c}")
sys.exit(1 if fautives or any(r[3] or r[4] for r in rapport) else 0)
