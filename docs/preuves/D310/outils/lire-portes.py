"""D310 — LECTURE DES PORTES D'UNE PASSE DE CERTIFICATION (rang 23), journaux relus EN ENTIER, codes ANSI retirés
(D275), comptes rendus avec ce qui a été parcouru (D290). Procédure archivée comme preuve (D291), écrite sur le patron
de `docs/preuves/D299/outils/lire-passe.py` (même calibration, mêmes motifs). N'écrit rien : elle imprime.
Usage, depuis la racine :  python docs/preuves/D310/outils/lire-portes.py <dossier de la passe>
Ne lit PAS le journal e2e brut (hors dépôt, jetons) : son code et son extrait seulement — l'extrait est lu à part.
⚠ Calibration à deux bras AVANT de lire : un résumé vitest construit AVEC codes ANSI doit rendre ses deux comptes ; un
texte sans résumé n'en rend aucun ; « FAIL » se compte en casse exacte et en tête de ligne — un test vert nommé « la
ligne passe FAILED » ne compte pas (D275), un vrai « FAIL » compte 1.
"""
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
            "done": len(re.findall(r"^(\S+) (?:\S+ )?\S+: Done", t, flags=re.M)),
            "fail": sum(1 for l in t.splitlines() if R_FAIL.match(l)),
            "failed_ctx": [l.strip()[:160] for l in t.splitlines() if re.search(r"fail", l, re.I)],
            "timed_out": len(re.findall(r"timed out", t)),
            "error_ts": len(re.findall(r"error TS\d+", t)),
            "elifecycle": len(re.findall(r"ELIFECYCLE", t)),
            "lignes": len(t.splitlines())}


brut = "\x1b[2m Test Files \x1b[22m \x1b[1m\x1b[32m3 passed\x1b[39m\x1b[22m\x1b[90m (3)\x1b[39m\n\x1b[2m      Tests \x1b[22m \x1b[1m\x1b[32m36 passed\x1b[39m\x1b[22m\x1b[90m (36)\x1b[39m\n"
pos = lire(brut)
neg = lire("rien ici\n ✓ la ligne passe FAILED quand le paiement échoue\n")
vrai = lire(" FAIL  src/x.test.ts > t\n")
ok = (pos["resumes"] == ["Test Files 3 passed (3)", "Tests 36 passed (36)"] and neg["resumes"] == []
      and neg["fail"] == 0 and vrai["fail"] == 1)
print(f"== CALIBRATION : résumé ANSI lu {pos['resumes']} · témoin sans résumé {neg['resumes']} · « FAILED » dans un nom "
      f"compté {neg['fail']} (attendu 0) · vrai FAIL compté {vrai['fail']} (attendu 1) → {'✓' if ok else '✗ ABANDON'}")
if not ok:
    sys.exit(2)
D = sys.argv[1]
for nom in ("typecheck", "lint", "test", "build", "testint"):
    t = open(os.path.join(D, nom + ".log"), "rb").read().decode("utf-8", errors="replace")
    code = open(os.path.join(D, nom + ".code")).read().strip()
    r = lire(t)
    print(f"\n== {nom} : code RÉEL {code} · {r['lignes']} lignes parcourues · « Done » {r['done']} · FAIL (casse exacte) "
          f"{r['fail']} · error TS {r['error_ts']} · ELIFECYCLE {r['elifecycle']} · timed out {r['timed_out']}")
    for x in r["resumes"]:
        print(f"   {x}")
    print(f"   lignes portant « fail » (toute casse), À CONFRONTER AU CONTEXTE : {len(r['failed_ctx'])}")
    for x in r["failed_ctx"]:
        print(f"     | {x}")
for nom in ("e2e", "campagnes-tout", "contre-epreuve"):
    p = os.path.join(D, nom + ".code")
    print(f"\n== {nom} : code RÉEL {open(p).read().strip() if os.path.isfile(p) else 'ABSENT'}")
