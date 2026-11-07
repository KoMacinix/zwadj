"""D342 — JOUE L'UNION DES CAMPAGNES (COPIE ADAPTÉE de `docs/preuves/D341/neutralisation/jouer-union.py`, archivée comme PREUVE, jamais promue en instrument — D291).
CE QUI CHANGE, et rien d'autre : (1) les chemins (liste lue dans `docs/preuves/D342/neutralisation/union-sortie.txt`, journaux sous `.neutralisation-journaux/d342-union/`) ; (2) la liste des campagnes jouées avec `--int`
(`AVEC_INT`), RELEVÉE sur le source des 35 campagnes de l'union : `e3d1-s8`, `r25`, `r33`, `r39`, `r41`, `r42`, `r43` ont un VRAI mode d'intégration (`if "--int" in argv` / `INT = "--int" in sys.argv`) ; `r37` et `r38`
ne mentionnent `--int` qu'en COMMENTAIRE et se jouent sans (D341 avait joué `r38` sans) ; (3) un PRÉ-VOL et un contrôle APRÈS CHAQUE campagne : l'arbre de travail doit être propre (`git status --short` vide) et sans stash —
une campagne MUTE des fichiers sources partagés, et une campagne tuée en laisse un cassé (D270) : si l'arbre n'est pas rendu propre, le script ARRÊTE la série (code 3) au lieu de lancer la suivante sur un arbre sale.

Joue chaque campagne EN SÉRIE (chacune MUTE des fichiers sources partagés : deux campagnes concurrentes se marcheraient dessus). Les verdicts se COMPTENT sur les lignes de sortie, comme `lancer-campagnes.py`
(D269 : un script arrêté en cours n'écrit aucun résumé). Les campagnes à cibles d'intégration ne sont jouées QU'UNE fois, avec `--int` : la passe `--int` contient toutes leurs cibles unitaires ; les jouer sans PUIS avec
compterait deux fois les mêmes gardes (N-C1 de la lecture adverse de D332). Chaque sortie ENTIÈRE est journalisée sous `.neutralisation-journaux/d342-union/` (ignoré par git) ; ce que la décision cite est COPIÉ ensuite
sous `docs/preuves/D342/neutralisation/`.

Imprime, pour chaque campagne, ce qu'elle a PARCOURU et l'attendu à côté (D290) : cibles mordues / muettes / non mesurées, et le résumé du harnais quand il en écrit un.
Codes : 0 = tout joué ET tout mordu ; 1 = une garde muette ou une campagne non mesurée ; 2 = la liste est introuvable, vide, ou nomme une campagne absente ; 3 = l'arbre n'est pas propre (au départ ou après une campagne).
Usage, depuis la racine, bash : python3 docs/preuves/D342/neutralisation/jouer-union.py [--seulement nom.py,nom2.py]
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

SORTIE_UNION = "docs/preuves/D342/neutralisation/union-sortie.txt"
JOURNAUX = os.path.join(".neutralisation-journaux", "d342-union")
MORDUES = re.compile(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible")
ROUGES = re.compile(r"(\d+) garde\(s\) neutralis..e\(s\) et ROUGE\(s\)")
AVEC_INT = ("neutralize-e3d1-s8.py", "neutralize-r25.py", "neutralize-r33.py", "neutralize-r39.py", "neutralize-r41.py", "neutralize-r42.py", "neutralize-r43.py")


def arbre_sale():
    r = subprocess.run(["git", "status", "--short"], capture_output=True, text=True, encoding="utf-8")
    s = subprocess.run(["git", "stash", "list"], capture_output=True, text=True, encoding="utf-8")
    return [l for l in r.stdout.splitlines() if l.strip()], [l for l in s.stdout.splitlines() if l.strip()]


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
sale, stash = arbre_sale()
if sale or stash:
    print(f"✗ PRÉ-VOL : l'arbre n'est pas propre ({len(sale)} ligne(s) de `git status --short`, {len(stash)} stash) — aucune campagne n'est lancée : {sale[:5]}")
    sys.exit(3)
print(f"liste versée : {len(noms)} campagne(s) · jouées dans ce lancement : {len(jouees)}" + ("" if filtre is None else f" (FILTRE {filtre} : un lancement filtré n'est pas la passe)") + f" · avec --int : {[n for n in jouees if n in AVEC_INT]} · arbre propre au départ : oui")

os.makedirs(JOURNAUX, exist_ok=True)
rapport = []
t0 = time.time()
for n in jouees:
    passages = [("--int", [sys.executable, os.path.join("neutralisation", n), "--int"])] if n in AVEC_INT else [("", [sys.executable, os.path.join("neutralisation", n)])]
    for suffixe, cmd in passages:
        etiquette = n + (f" {suffixe}" if suffixe else "")
        debut = time.time()
        print(f"\n[{len(rapport) + 1}/{len(jouees)}] {etiquette} … ({time.strftime('%H:%M:%S')})", flush=True)
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
        sale, stash = arbre_sale()
        print(f"    sortie={r.returncode} · {mordues} mordue(s), {muettes} muette(s)/erreur(s), {non_mes} non mesurée(s) · {resume} · {round(time.time() - debut)} s · arbre propre après : {'oui' if not sale and not stash else 'NON'}", flush=True)
        if sale or stash:
            print(f"✗ L'ARBRE N'EST PAS RENDU PROPRE après {etiquette} ({len(sale)} ligne(s), {len(stash)} stash) : {sale[:8]} — la série S'ARRÊTE ici (D270).")
            sys.exit(3)

print("\n" + "=" * 120)
print(f"{'campagne':34s} {'sortie':>6s} {'mord':>5s} {'muet':>5s} {'nonm':>5s} {'sec':>5s}  résumé du harnais")
for etiquette, code, mord, muet, nonm, resume, sec in rapport:
    print(f"{etiquette:34s} {code:>6d} {mord:>5d} {muet:>5d} {nonm:>5d} {sec:>5d}  {resume}")
print("=" * 120)
print(f"PARCOURU : {len(rapport)} passage(s) pour {len(jouees)} campagne(s) (attendu : autant que de campagnes ; chaque campagne à mode d'intégration est jouée UNE fois, avec --int) · {round(time.time() - t0)}s")
fautives = [(e, c) for e, c, *_ in rapport if c != 0]
print(f"MESURÉ : {sum(r[2] for r in rapport)} garde(s) mordue(s) · {sum(r[3] for r in rapport)} muette(s)/erreur(s) · {sum(r[4] for r in rapport)} non mesurée(s) · {len(fautives)} sortie(s) non nulle(s) (attendu : 0, 0, 0)")
for e, c in fautives:
    print(f"  ⚠ {e} → sortie {c}")
sale, stash = arbre_sale()
print(f"ARBRE à la fin : {'propre' if not sale and not stash else 'NON PROPRE ' + str(sale[:5])} (attendu : propre)")
sys.exit(1 if fautives or any(r[3] or r[4] for r in rapport) or sale or stash else 0)
