"""D332 — neutralisation À LA MAIN de la spec e2e `r33-remise-devis.e2e.ts` : deux mutations de `walkin-journey.tsx`, la spec ciblée est jouée dans un vrai navigateur, la SORTIE EST LUE, le fichier est restauré à l'octet.
Procédure archivée comme PREUVE (D291), jamais promue en instrument. Aucune campagne ne mute le code pour une e2e (jsdom ne télécharge rien, ne lit pas un en-tête de réponse).
Sauvegarde sur DISQUE avant la mutation (`.e2e-main.sauvegarde`) ; restaurée dans `finally` ET au démarrage suivant ; empreinte comparée avant/après."""
import hashlib
import os
import re
import shutil
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")

CIBLE = "apps/pro/src/dashboard/walkin-journey.tsx"
SAUV = ".e2e-main.sauvegarde"
ANSI = re.compile(r"\x1b\[[0-9;]*m")

MUTANTS = [
    ("E-1. ANNULER la boîte remet quand même (le canal est enregistré, le PDF téléchargé) — la spec d'annulation doit rougir",
     "onCancel={() => setLangueDe(null)}",
     'onCancel={() => { const canal = langueDe; setLangueDe(null); if (canal !== null) remettre(canal, "fr"); }}',
     "ANNULER la boîte de langue"),
    ("E-2. la langue envoyée est toujours le français — la spec « PRINT, page fr, PDF ar » doit rougir (Content-Language et paramètre `locale`)",
     "if (canal !== null) remettre(canal, locale);",
     'if (canal !== null) remettre(canal, "fr");',
     "« PRINT », page fr, PDF ar"),
]

if os.path.exists(SAUV):
    shutil.copyfile(SAUV, CIBLE)
    os.remove(SAUV)
    print("↺ fichier restauré depuis une exécution interrompue")

original = open(CIBLE, "rb").read()
empreinte = hashlib.sha256(original).hexdigest()
print(f"départ : {CIBLE} · {len(original)} octets · sha256 {empreinte[:16]}…")
bilan = []
for libelle, avant, apres, filtre in MUTANTS:
    crlf = b"\r\n" in original
    texte = original.decode("utf-8")
    n_avant, n_marque = texte.count(avant), texte.count(apres)
    assert n_avant == 1, f"{libelle[:5]} : ancre ×{n_avant}"
    mute = texte.replace(avant, apres)
    assert (mute.count(avant), mute.count(apres)) == (0, n_marque + 1), f"{libelle[:5]} : mutation non posée"
    open(SAUV, "wb").write(original)
    open(CIBLE, "wb").write(mute.encode("utf-8"))
    try:
        r = subprocess.run(["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "specs/r33-remise-devis.e2e.ts", "-g", filtre, "--reporter=list"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", shell=(os.name == "nt"))
        sortie = ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))
    finally:
        shutil.copyfile(SAUV, CIBLE)
        os.remove(SAUV)
    apres_emp = hashlib.sha256(open(CIBLE, "rb").read()).hexdigest()
    lignes = sortie.splitlines()
    echecs = [l for l in lignes if re.match(r"^\s+(✘|x)\s+\d+ \[chromium\]", l)]
    # la LECTURE : la première ligne d'erreur du bloc du test en échec (une assertion, pas un délai de navigation ni une erreur de requête)
    erreurs = [l.strip() for l in lignes if l.strip().startswith("Error: expect(") or l.strip().startswith("Error:") and "Timeout" not in l][:3]
    resume = [l.strip() for l in lignes if re.match(r"^\s*\d+ (passed|failed|flaky|skipped|did not run)", l)]
    print(f"\n■ {libelle}\n   ancre 1→0 · marqueur {n_marque}→{n_marque + 1} · filtre « {filtre} » · code {r.returncode}")
    print(f"   tests en échec : {len(echecs)} · résumé Playwright : {resume} · empreinte restaurée : {'identique' if apres_emp == empreinte else 'DIFFÉRENTE'}")
    for e in echecs:
        print(f"   {e.strip()[:230]}")
    for i, l in enumerate(lignes):
        if re.match(r"^\s+1\) \[chromium\]", l):
            bloc = [x.rstrip() for x in lignes[i + 1:i + 16] if x.strip()][:9]
            print("   bloc d'échec lu (les lignes qui suivent l'en-tête « 1) ») :")
            for x in bloc:
                print(f"      {x[:200]}")
            break
    bilan.append((libelle[:4], len(echecs), r.returncode, apres_emp == empreinte))

print("\nBILAN :", " · ".join(f"{i} : {n} échec(s), code {c}, restauré {'oui' if ok else 'NON'}" for i, n, c, ok in bilan), "(attendu : ≥ 1 échec chacun, code ≠ 0, restauré oui)")
sys.exit(0 if all(n >= 1 and c != 0 and ok for _, n, c, ok in bilan) else 1)
