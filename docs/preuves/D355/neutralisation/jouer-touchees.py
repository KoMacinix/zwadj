#!/usr/bin/env python3
"""D355 — joue, EN SÉRIE et dans le mode COMPLET qui couvre ce que le lot touche, les campagnes que `lancer-touchees.py --liste` désigne pour le code du rang 57 (8 : booking-status, r39, r41, r42, r43, r44, r56, s10b), et la campagne
du lot elle-même (`r57`, ENTIÈRE, avec `--int`). Adapté de `docs/preuves/D354/neutralisation/touchees/jouer-touchees.py` : seules la liste des campagnes et l'étiquette du lot changent.

POURQUOI IL EXISTE : `lancer-touchees.py` joue chaque campagne SANS `--int` : les cibles d'intégration y sont COMPTÉES « non jouées ». Ce lot modifie des magasins et des services que ces campagnes lisent ; leurs cibles d'intégration
sont celles qui pourraient avoir cessé de mordre. MODES : `s10b` et `booking-status` sans mode (ils n'en ont pas : harnais d'un format ancien) ; `r39`, `r41`, `r42`, `r43`, `r44`, `r56` et `r57` avec `--int`. Chaque sortie brute va
dans <dossier>/<campagne>.txt (hors dépôt, puis versée masquée). L'ORDRE : celui de la consigne du rang 57 (§ 3) — les campagnes se jouent AVANT les six portes, sur le MÊME arbre ; la preuve de l'identité de l'arbre est écrite à part
(`attester-arbre.py`, avant et après). Archivé comme PIÈCE (D291), jamais promu en instrument.
Usage, depuis la RACINE : python3 jouer-touchees.py <dossier de sortie> [--seulement a,b,c]   (`--seulement` : reprise déclarée d'une partie de la liste, jamais une campagne verte à elle seule)"""
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
CAMPAGNES = [("r57", ["--int"]), ("r44", ["--int"]), ("r56", ["--int"]), ("r41", ["--int"]), ("r43", ["--int"]), ("r39", ["--int"]), ("r42", ["--int"]), ("s10b", []), ("booking-status", [])]
if "--seulement" in sys.argv:
    voulues = sys.argv[sys.argv.index("--seulement") + 1].split(",")
    CAMPAGNES = [c for c in CAMPAGNES if c[0] in voulues]
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
    print(f"  {nom:14s} {' '.join(modes):6s} code {code}{' ⛔ERREUR' if err else ''} · {int(d)} s · {resume[:190]}")
print(f"codes : 0 = {sum(1 for b in bilan if b[2] == 0)} · autre = {sum(1 for b in bilan if b[2] != 0)} (attendu : 0 partout)")
sys.exit(0 if all(b[2] == 0 for b in bilan) else 1)
