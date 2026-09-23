import sys, glob, re
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
# Les journaux de campagne versés portent-ils la sortie qui montre l'assertion en échec ?
# Marqueurs de sortie Vitest d'un test en échec (relevés sur la sortie brute d'argon2/horizon) :
MARQ = {
    "croix_vitest": re.compile(r"^\s*(×|✗|FAIL)\s+\S+.*(spec|test)\.", re.M),
    "AssertionError": re.compile(r"AssertionError"),
    "expected_to": re.compile(r"\bexpected\b.*\bto\b"),
    "Tests_failed": re.compile(r"Tests\s+\d+\s+failed"),
}
# Calibration, deux bras.
pos = "FAIL  src/x.spec.ts > y\nAssertionError: expected 1 to be 2\n Tests  1 failed (3)\n × src/a.spec.ts > z\n"
neg = "✓ E1. ⛔ L'INDEX PARTIEL DISPARAÎT  [course]\n8 garde(s) mordue(s) sur 8 cible(s)\n"
cp = {k: len(r.findall(pos)) for k, r in MARQ.items()}
cn = {k: len(r.findall(neg)) for k, r in MARQ.items()}
print("calibration positif", cp, "(attendu tous >= 1) · negatif", cn, "(attendu tous 0)")
assert all(v >= 1 for v in cp.values()) and all(v == 0 for v in cn.values())
fichiers = sorted(glob.glob("docs/preuves/*/campagnes/*.log") + glob.glob("docs/preuves/*/passe/campagnes/*.log")
                  + glob.glob("docs/preuves/*/passe/rang*-int-*.log"))
print("journaux parcourus :", len(fichiers))
tot_lignes = 0
porteurs = {k: 0 for k in MARQ}
coches = 0
for f in fichiers:
    t = open(f, encoding="utf-8", errors="replace").read()
    tot_lignes += len(t.splitlines())
    coches += len(re.findall(r"^✓ ", t, re.M))
    for k, r in MARQ.items():
        if r.search(t):
            porteurs[k] += 1
print("lignes parcourues :", tot_lignes, "· lignes « ✓ » (cibles/pré-vols) :", coches)
for k, v in porteurs.items():
    print(f"   journaux portant « {k} » : {v} sur {len(fichiers)}")
