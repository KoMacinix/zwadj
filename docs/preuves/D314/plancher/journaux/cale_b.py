import json, os, subprocess, sys
sys.stderr.reconfigure(encoding="utf-8")
outil, args = sys.argv[1], sys.argv[2:]
nouveaux, reecrit = list(args), None
if outil == "pnpm":
    for mot, faux in (("exec", "zwadj-commande-introuvable-d314"), ("run", "zwadj-script-introuvable-d314")):
        if mot in nouveaux and nouveaux.index(mot) + 1 < len(nouveaux):
            i = nouveaux.index(mot) + 1
            reecrit = [mot, nouveaux[i]]
            nouveaux[i] = faux
            break
else:
    for i, a in enumerate(nouveaux):
        if a.endswith((".mjs", ".cjs", ".js")):
            reecrit = ["module", a]
            nouveaux[i] = os.path.join(os.path.dirname(a), "zwadj-module-introuvable-d314.mjs")
            break
with open(os.environ["ZWADJ_D314_CALE"], "a", encoding="utf-8") as f:
    f.write(json.dumps({"niveau": "B", "outil": outil, "reecrit": reecrit, "args": args}, ensure_ascii=False) + "\n")
if reecrit is None:
    print("CALE B : forme d'appel non reconnue, NON RÉÉCRIT — rien n'est lancé", file=sys.stderr)
    sys.exit(127)
reel = os.environ["ZWADJ_D314_PNPM"] if outil == "pnpm" else os.environ["ZWADJ_D314_NODE"]
sys.exit(subprocess.run([reel, *nouveaux], env={**os.environ, "PATH": os.environ["ZWADJ_D314_PATH_REEL"]}).returncode)
