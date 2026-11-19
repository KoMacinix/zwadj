#!/usr/bin/env python3
"""D354 — joue, EN SÉRIE et dans le mode COMPLET qui couvre ce que le lot touche, les campagnes que `lancer-touchees.py --liste` désigne (8 : adm1, adm2, r25, r33, r38, r39, r43, r44 ; r56, la campagne du lot, a été jouée ENTIÈRE à part).

POURQUOI IL EXISTE : `lancer-touchees.py` joue chaque campagne SANS `--int` ni `--e2e` : les cibles d'intégration y sont COMPTÉES « non jouées ». Ce lot modifie des contrôleurs et des modules que ces campagnes lisent ; leurs cibles d'intégration (PostgreSQL réel) sont celles qui peuvent
avoir cessé de mordre. INSTRUMENT ÉCARTÉ : `lancer-touchees.py --sauf …` + un appel à la main par campagne (D353) — même résultat, sans le journal d'ordre de ce relevé.
MODES : `r38` sans mode (aucune cible d'intégration) ; `adm1`, `adm2`, `r25`, `r33`, `r39`, `r43`, `r44` avec `--int`. `--e2e` n'est PAS joué (adm2, r25) : les fichiers communs avec le lot (`packages/i18n/messages/ar.json`, `account.controller.ts`) ne sont lus que par des mesures
unitaires et d'intégration ; ce choix est écrit au rapport. Chaque sortie brute va dans <dossier>/<campagne>.txt (hors dépôt, puis versée masquée). Archivé comme PIÈCE (D291), jamais promu en instrument.
Usage, depuis la RACINE : python3 jouer_touchees.py <dossier de sortie>"""
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
dossier = sys.argv[1]
os.makedirs(dossier, exist_ok=True)
CAMPAGNES = [("r38", []), ("r25", ["--int"]), ("adm1", ["--int"]), ("adm2", ["--int"]), ("r33", ["--int"]), ("r39", ["--int"]), ("r43", ["--int"]), ("r44", ["--int"])]
bilan = []
t0 = time.time()
for nom, modes in CAMPAGNES:
    debut = time.time()
    print(f"\n[{nom} {' '.join(modes)}] départ {time.strftime('%H:%M:%S')} …", flush=True)
    r = subprocess.run([sys.executable, "-I", "-X", "utf8", "-u", f"neutralisation/neutralize-{nom}.py", *modes], capture_output=True, text=True, encoding="utf-8", errors="replace")
    sortie = r.stdout + (("\n[stderr]\n" + r.stderr) if r.stderr.strip() else "")
    io.open(os.path.join(dossier, f"{nom}.txt"), "w", encoding="utf-8", newline="\n").write(sortie)
    resume = [l.strip() for l in sortie.splitlines() if re.search(r"garde\(s\) (mordue|neutralisée)", l)]
    erreur_script = "ERREUR DE SCRIPT" in sortie
    bilan.append((nom, modes, r.returncode, resume[-1] if resume else "AUCUNE LIGNE DE RÉSUMÉ", erreur_script, time.time() - debut))
    print(f"    code {r.returncode} · {int(time.time() - debut)} s · {resume[-1][:200] if resume else 'AUCUNE LIGNE DE RÉSUMÉ'}{' · ⛔ ERREUR DE SCRIPT' if erreur_script else ''}", flush=True)
print(f"\n== BILAN : {len(bilan)} campagne(s) jouée(s), durée {int(time.time() - t0)} s ==")
for nom, modes, code, resume, err, d in bilan:
    print(f"  {nom:6s} {' '.join(modes):6s} code {code}{' ⛔ERREUR' if err else ''} · {int(d)} s · {resume[:190]}")
print(f"codes : 0 = {sum(1 for b in bilan if b[2] == 0)} · autre = {sum(1 for b in bilan if b[2] != 0)} (attendu : 0 partout)")
sys.exit(0 if all(b[2] == 0 for b in bilan) else 1)
