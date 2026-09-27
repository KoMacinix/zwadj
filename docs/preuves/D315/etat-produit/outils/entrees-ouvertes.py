"""D315 — rang 24 — les ENTRÉES OUVERTES du backlog dans les phases qui décrivent les parcours, relevées à HEAD.
Pièce jetable, versée. N'écrit rien. Sert de RÉFÉRENCE aux renvois de la pièce d'état (« B:<ligne> ») : chaque entrée
est imprimée avec son numéro de ligne dans `ZWADJ_BACKLOG.md` au commit lu, sa phase et ses 170 premiers caractères.
Les VERDICTS (réalisé / partiel / absent / …) ne sont PAS calculés ici : ils sont écrits à la main dans la pièce, chacun
avec la preuve lue dans le code — un extracteur ne juge pas.
Phases : bornées par leurs titres « ## PHASE N — », jamais par des numéros de ligne écrits en dur (le fichier grossit).
Calibration, deux bras : (+) l'entrée « Require idempotency key on `POST /bookings` » doit être trouvée en PHASE 6 ;
(−) l'entrée COCHÉE « Wire shared packages into pro app » (PHASE 10) doit exister dans le fichier et NE PAS être
rendue. ⚠ La première version comptait les « [x] » parmi les lignes rendues — tautologique, le filtre exige « [ ] » :
un bras qui ne peut pas échouer ne calibre rien (D223). Remplacé, rejoué.
Usage, depuis la racine :  python docs/preuves/D315/etat-produit/outils/entrees-ouvertes.py [SHA]   (défaut : HEAD)
"""
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sha = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
texte = subprocess.run(["git", "show", f"{sha}:ZWADJ_BACKLOG.md"], capture_output=True).stdout.decode("utf-8")
lignes = texte.splitlines()
PHASES = {"6", "8", "9", "10", "12"}
phase, vues, rendues, calib, neg_existe, neg_rendue = None, 0, 0, False, False, False
par_phase: dict[str, int] = {}
print(f"ZWADJ_BACKLOG.md à {subprocess.run(['git', 'rev-parse', '--short=7', sha], capture_output=True, text=True).stdout.strip()} "
      f"· {len(lignes)} lignes parcourues · phases retenues : {sorted(PHASES, key=int)}")
for i, l in enumerate(lignes, start=1):
    m = re.match(r"^## PHASE (\d+) — ", l)
    if m:
        phase = m.group(1)
        continue
    if l.startswith("## "):
        phase = None
        continue
    if re.match(r"^\s*- \[[ x~]\]", l):
        vues += 1
    if phase == "10" and re.match(r"^\s*- \[x\] Wire shared packages into pro app", l):
        neg_existe = True
    if phase in PHASES and re.match(r"^\s*- \[ \]", l):
        rendues += 1
        par_phase[phase] = par_phase.get(phase, 0) + 1
        if phase == "6" and "Require idempotency key on `POST /bookings`" in l:
            calib = True
        neg_rendue |= "Wire shared packages into pro app" in l
        print(f"B:{i:<5} P{phase:<3} {l.strip()[:170]}")
print(f"\nentrées à case (toutes phases) parcourues : {vues} · ouvertes rendues dans les phases retenues : {rendues} "
      f"· par phase : {dict(sorted(par_phase.items(), key=lambda x: int(x[0])))}")
print(f"calibration (+) idempotence de POST /bookings trouvée en PHASE 6 : {'✓' if calib else '✗'} · "
      f"(−) entrée cochée « Wire shared packages » présente {neg_existe} (attendu True), rendue {neg_rendue} (attendu False)")
if not calib or not neg_existe or neg_rendue:
    sys.exit(2)
