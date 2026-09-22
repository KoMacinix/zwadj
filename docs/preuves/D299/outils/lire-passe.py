"""Lit les journaux de la passe du rang 19 (D299) EN ENTIER, codes ANSI retirés (D275), et rend les comptes
avec ce qui a été parcouru (D290). Usage, depuis la racine :
    python3 docs/preuves/D299/outils/lire-passe.py <dossier des journaux rang19-*>
⚠ Calibration de l'extracteur, sur ses deux bras, AVANT de lire la passe : un résumé vitest construit AVEC
codes ANSI doit rendre ses deux comptes (le motif appliqué au brut n'y verrait rien) ; un texte sans
résumé doit n'en rendre aucun. ⚠ « FAIL » se compte EN CASSE EXACTE et en tête de ligne : un test vert
nommé « la ligne passe FAILED » ne doit pas compter (D275) — bras construit aussi.
Ne lit PAS le journal e2e brut (hors dépôt, jetons) : seulement son code et son extrait."""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
R_RESUME = re.compile(r"^\s*(Test Files|Tests)\s+(.*)$")
R_FAIL = re.compile(r"^\s*(?:\S+\s+)?FAIL\s")


def lire(texte: str) -> dict:
    t = ANSI.sub("", texte)
    return {"resumes": [m.group(1) + " " + m.group(2).strip() for l in t.splitlines() for m in [R_RESUME.match(l)] if m],
            "done": re.findall(r"^(\S+) (?:\S+ )?\S+: Done", t, flags=re.M),
            "fail": sum(1 for l in t.splitlines() if R_FAIL.match(l)),
            "timed_out": len(re.findall(r"timed out", t)),
            "error_ts": len(re.findall(r"error TS\d+", t)),
            "elifecycle": len(re.findall(r"ELIFECYCLE", t)),
            "lignes": len(t.splitlines())}


# calibration
brut = "\x1b[2m Test Files \x1b[22m \x1b[1m\x1b[32m3 passed\x1b[39m\x1b[22m\x1b[90m (3)\x1b[39m\n\x1b[2m      Tests \x1b[22m \x1b[1m\x1b[32m36 passed\x1b[39m\x1b[22m\x1b[90m (36)\x1b[39m\n"
pos = lire(brut)
neg = lire("rien ici\n ✓ la ligne passe FAILED quand le paiement échoue\n")
ok = (pos["resumes"] == ["Test Files 3 passed (3)", "Tests 36 passed (36)"]
      and not re.findall(r"Test Files", "\n".join(l for l in brut.splitlines() if re.match(r"^\s*Test Files", l)))
      and neg["resumes"] == [] and neg["fail"] == 0 and lire(" FAIL  src/x.test.ts > t\n")["fail"] == 1)
print(f"== CALIBRATION : résumé ANSI lu {pos['resumes']} · témoin sans résumé {neg['resumes']} · « FAILED » dans un nom"
      f" compté {neg['fail']} (attendu 0) · vrai FAIL compté {lire(' FAIL  src/x.test.ts > t' + chr(10))['fail']} (attendu 1)"
      f" → {'✓' if ok else '✗ ABANDON'}")
if not ok:
    sys.exit(2)
d = sys.argv[1]
for nom in sorted(os.listdir(d)):
    if not (nom.startswith("rang19-") and nom.endswith(".log")) or "e2e" in nom:
        continue
    b = open(os.path.join(d, nom), "rb").read()
    r = lire(b.decode("utf-8", errors="replace"))
    code = open(os.path.join(d, nom[:-4] + ".code")).read().strip() if os.path.isfile(os.path.join(d, nom[:-4] + ".code")) else "—"
    print(f"== {nom} : {r['lignes']} lignes, {len(b)} octets · code {code}")
    if r["done"]:
        print(f"   « Done » : {len(r['done'])} — {', '.join(r['done'])}")
    for s in r["resumes"]:
        print(f"   {s}")
    print(f"   FAIL (casse exacte, tête de ligne) {r['fail']} · « timed out » {r['timed_out']} · error TS {r['error_ts']}"
          f" · ELIFECYCLE {r['elifecycle']}")
