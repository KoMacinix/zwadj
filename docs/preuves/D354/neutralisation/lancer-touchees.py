#!/usr/bin/env python3
"""D352 — joue les campagnes que le lot TOUCHE, quand le lot est déjà COMMITÉ.

POURQUOI IL EXISTE : `neutralisation/lancer-campagnes.py` trie par `git diff --name-only HEAD` ; un lot dont tout est commité n'a plus rien « depuis HEAD » et le tri rend « aucune » (« ce n'est PAS une preuve de livraison », dit son message). Ce wrapper IMPORTE le lanceur, **remplace seulement la fonction `modifies()`** par `git diff --name-only <SHA de départ>..HEAD`, et réutilise tel quel `campagnes()`, `fichiers_lus()` et `lancer()`. Il ne duplique aucune règle de tri.
INSTRUMENTS ÉCARTÉS : `lancer-campagnes.py --tout` (68 campagnes : la LIVRAISON, pas ce lot — la consigne dit « les campagnes que le lot TOUCHE ») ; `git reset --mixed <départ>` pour faire croire au lanceur que rien n'est commité (une écriture sur la branche, réversible mais inutile).
Usage, depuis la RACINE : python3 lancer-touchees.py <SHA de départ> <dossier de journaux> [--liste] [--sauf neutralize-a.py,neutralize-b.py]
`--sauf` : campagnes jouées À PART, en mode complet (ici `adm2 --int --e2e`, `r54`) ; elles sont LISTÉES comme concernées, jamais rejouées ici (le lanceur ne passe ni `--int` ni `--e2e`).
Ce qu'il rend : la table des campagnes concernées (avec le nombre de fichiers en commun), puis, par campagne jouée, son code de sortie et SA LIGNE DE RÉSUMÉ lue dans sa sortie. Les journaux bruts vont dans <dossier> (hors dépôt)."""
import importlib.util
import io
import os
import re
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)
depart, dossier = sys.argv[1], sys.argv[2]
liste_seule = "--liste" in sys.argv
sauf = set()
if "--sauf" in sys.argv:
    sauf = set(sys.argv[sys.argv.index("--sauf") + 1].split(","))

spec = importlib.util.spec_from_file_location("lanceur", "neutralisation/lancer-campagnes.py")
lanceur = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lanceur)

r = subprocess.run(["git", "diff", "--name-only", f"{depart}..HEAD"], capture_output=True, text=True, encoding="utf-8")
touches = {l.strip().replace("\\", "/") for l in r.stdout.splitlines() if l.strip()}
toutes = lanceur.campagnes()
aveugles = [p for p in toutes if not lanceur.fichiers_lus(p)]
retenues = [p for p in toutes if lanceur.fichiers_lus(p) & touches]
print(f"{len(touches)} fichier(s) modifié(s) depuis {depart[:7]} → {len(retenues)} campagne(s) concernée(s) sur {len(toutes)} ; campagnes sans fichier détecté : {len(aveugles)} {[os.path.basename(a) for a in aveugles]}")
for p in retenues:
    communs = sorted(lanceur.fichiers_lus(p) & touches)
    marque = "  (à part, mode complet)" if os.path.basename(p) in sauf else ""
    print(f"  · {os.path.basename(p)}  ({len(communs)} fichier(s) en commun){marque}")
    for c in communs[:3]:
        print(f"      {c}")
if liste_seule:
    sys.exit(0)

os.makedirs(dossier, exist_ok=True)
a_jouer = [p for p in retenues if os.path.basename(p) not in sauf]
print(f"\n{len(a_jouer)} campagne(s) jouée(s) ici, en série (jamais en parallèle : chacune MUTE des fichiers sources) ; {len(retenues) - len(a_jouer)} jouée(s) à part.", flush=True)
bilan = []
t0 = time.time()
for i, script in enumerate(a_jouer, 1):
    debut = time.time()
    print(f"\n[{i}/{len(a_jouer)}] {script} …", flush=True)
    code, sortie = lanceur.lancer(script)
    io.open(os.path.join(dossier, os.path.basename(script) + ".log"), "w", encoding="utf-8").write(sortie)
    # la ligne de résumé, LUE dans la sortie (deux formats coexistent, D269)
    resume = [l.strip() for l in sortie.splitlines() if re.search(r"garde\(s\) (mordue|neutralisée)", l)]
    erreur_script = "ERREUR DE SCRIPT" in sortie
    bilan.append((os.path.basename(script), code, resume[-1] if resume else "AUCUNE LIGNE DE RÉSUMÉ", erreur_script, time.time() - debut))
    print(f"    code {code} · {int(time.time() - debut)} s · {resume[-1][:190] if resume else 'AUCUNE LIGNE DE RÉSUMÉ'}{' · ⛔ ERREUR DE SCRIPT' if erreur_script else ''}", flush=True)
print(f"\n== BILAN : {len(bilan)} campagne(s) examinée(s), durée {int(time.time() - t0)} s ==")
for nom, code, resume, err, d in bilan:
    print(f"  {nom:40s} code {code}{' ⛔ERREUR' if err else ''} · {resume[:170]}")
print(f"codes : 0 = {sum(1 for b in bilan if b[1] == 0)} · 1 (muette) = {sum(1 for b in bilan if b[1] == 1)} · 2 (pré-vol / erreur de script) = {sum(1 for b in bilan if b[1] == 2)} · 3 (incomplète, cibles hors exécution) = {sum(1 for b in bilan if b[1] == 3)} · autre = {sum(1 for b in bilan if b[1] not in (0, 1, 2, 3))}")
