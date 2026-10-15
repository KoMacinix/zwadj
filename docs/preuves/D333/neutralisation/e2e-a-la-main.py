"""D333 — neutralisation À LA MAIN de la spec e2e `r33-remise-devis.e2e.ts` pour le rang 39 : quatre mutations (l'app Pro ×3, l'API ×1), la spec ciblée est jouée dans un vrai navigateur, la SORTIE EST LUE,
le fichier est restauré à l'octet. Adapté de `docs/preuves/D332/neutralisation/e2e-a-la-main.py` (une mutation PAR FICHIER, au lieu d'un seul fichier cible).
Procédure archivée comme PREUVE (D291), jamais promue en instrument. Aucune campagne ne mute le code pour une e2e (jsdom ne télécharge rien, ne lit pas un en-tête de réponse, ne démarre pas l'API).
Sauvegarde sur DISQUE avant la mutation (`.e2e-main.sauvegarde`) ; restaurée dans `finally` ET au démarrage suivant ; empreinte comparée avant/après.
LECTURE (D323) : une assertion Playwright web-first (`expect(...)`) qui expire après ses réessais EST un échec d'assertion si l'échec lu montre l'appel `expect` avec l'attendu et le reçu ; un délai d'ACTION
(`click`, `goto`) ou de test n'en est PAS un."""
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

SAUV = ".e2e-main.sauvegarde"
ANSI = re.compile(r"\x1b\[[0-9;]*m")
WK = "apps/pro/src/dashboard/walkin-journey.tsx"
REMISE = "apps/pro/src/dashboard/remittance.ts"
MAGASIN = "apps/api/src/venues/quote-store.prisma.ts"

MUTANTS = [
    ("E-1. la référence affichée après « Calculer le devis » n'est pas celle du serveur (l'identifiant à sa place) — la spec doit rougir sur la référence à l'écran", WK,
     '<bdi dir="ltr">{quote.reference}</bdi>', '<bdi dir="ltr">{quote.id}</bdi>', "« PRINT », page fr, PDF ar"),
    ("E-2. le fichier téléchargé porte toujours `_fr_` — la spec « PRINT, page fr, PDF ar » doit rougir sur le nom du fichier", WK,
     "quoteDocumentFilename(courant, documentLocale)", 'quoteDocumentFilename(courant, "fr")', "« PRINT », page fr, PDF ar"),
    ("E-3. la fenêtre de remise n'a plus la ligne de référence — la spec doit rougir sur le texte de la fenêtre", REMISE,
     '{ key: "remitReference", reference },', '{ key: "remitNeutralisee", reference },', "« PRINT », page fr, PDF ar"),
    ("E-4. le numéro du devis écrit est toujours 1 (l'API) — la spec « DEUXIÈME devis » doit rougir sur le statut de la seconde création", MAGASIN,
     "referenceNumber: numero,", "referenceNumber: 1,", "DEUXIÈME devis"),
]

if os.path.exists(SAUV):
    print("✗ une sauvegarde d'une exécution interrompue existe : à restaurer à la main (le fichier ciblé est inconnu).")
    sys.exit(2)

bilan = []
for libelle, cible, avant, apres, filtre in MUTANTS:
    original = open(cible, "rb").read()
    empreinte = hashlib.sha256(original).hexdigest()
    texte = original.decode("utf-8")
    n_avant, n_marque = texte.count(avant), texte.count(apres)
    assert n_avant == 1, f"{libelle[:5]} : ancre ×{n_avant}"
    mute = texte.replace(avant, apres)
    assert (mute.count(avant), mute.count(apres)) == (0, n_marque + 1), f"{libelle[:5]} : mutation non posée"
    print(f"\ndépart : {cible} · {len(original)} octets · sha256 {empreinte[:16]}…")
    open(SAUV, "wb").write(original)
    open(cible, "wb").write(mute.encode("utf-8"))
    try:
        r = subprocess.run(["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "specs/r33-remise-devis.e2e.ts", "-g", filtre, "--reporter=list"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", shell=(os.name == "nt"))
        sortie = ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))
    finally:
        shutil.copyfile(SAUV, cible)
        os.remove(SAUV)
    apres_emp = hashlib.sha256(open(cible, "rb").read()).hexdigest()
    lignes = sortie.splitlines()
    echecs = [l for l in lignes if re.match(r"^\s+(✘|x)\s+\d+ \[chromium\]", l)]
    resume = [l.strip() for l in lignes if re.match(r"^\s*\d+ (passed|failed|flaky|skipped|did not run)", l)]
    print(f"■ {libelle}\n   fichier {cible} · ancre 1→0 · marqueur {n_marque}→{n_marque + 1} · filtre « {filtre} » · code {r.returncode}")
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
    lu = "\n".join(lignes)
    # une MORSURE : l'appel `expect(...)` figure dans le bloc d'échec, avec l'attendu et le reçu — pas un délai d'ACTION
    assertion = bool(re.search(r"expect\((received|locator)\)|Expected|Received", lu)) and "locator.click: Timeout" not in lu
    bilan.append((libelle[:4], len(echecs), r.returncode, apres_emp == empreinte, assertion))

print("\nBILAN :", " · ".join(f"{i} : {n} échec(s), code {c}, restauré {'oui' if ok else 'NON'}, assertion lue {'oui' if a else 'NON'}" for i, n, c, ok, a in bilan),
      "(attendu : ≥ 1 échec chacun, code ≠ 0, restauré oui, assertion lue oui)")
sys.exit(0 if all(n >= 1 and c != 0 and ok and a for _, n, c, ok, a in bilan) else 1)
