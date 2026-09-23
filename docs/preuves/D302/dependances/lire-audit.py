"""D302 — lecture du `pnpm audit` rejoué et des versions RÉSOLUES dans le lockfile. PIÈCE de ce lot, pas un
instrument : elle ne se rejoue que sur ces fichiers.
Usage, depuis la racine : python3 docs/preuves/D302/dependances/lire-audit.py
Entrées : docs/preuves/D302/dependances/pnpm-audit.json (sortie brute) et pnpm-lock.yaml (section `packages:`).
Imprime : les compteurs de l'outil (metadata) À CÔTÉ des compteurs recomptés sur les avis ; les GHSA distincts ;
la ventilation par paquet ; puis, pour chaque paquet que l'audit sécu du 09/09 nomme (table P1 et annexe), TOUTES
les versions résolues dans le lockfile et les versions signalées par l'outil aujourd'hui.
CALIBRATION (D275 — un extracteur se vérifie contre la sortie brute avant de servir à compter), ABANDON si un bras
manque :
  avis     le nombre d'avis lus = le nombre d'occurrences brutes de la clé "module_name" dans le JSON ;
  lockfile bras positif : la version signalée par l'outil pour @hono/node-server figure parmi les versions résolues
           de ce paquet ; bras négatif : un paquet inexistant rend zéro version."""
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO."); sys.exit(2)
ICI = "docs/preuves/D302/dependances"
brut = open(f"{ICI}/pnpm-audit.json", encoding="utf-8").read()
d = json.loads(brut)
avis = list(d["advisories"].values())

lock = open("pnpm-lock.yaml", encoding="utf-8").read().replace("\r\n", "\n")
section = lock.split("\npackages:\n", 1)[1].split("\nsnapshots:\n", 1)[0]
RX = re.compile(r"^  '?((?:@[^/@\s']+/)?[^@\s']+)@([^:'(\s]+)", re.M)
resolues = defaultdict(set)
for m in RX.finditer(section):
    resolues[m.group(1)].add(m.group(2))

# calibration
bruts = brut.count('"module_name"')
hono = sorted({f["version"] for a in avis if a["module_name"] == "@hono/node-server" for f in a["findings"]})
pos = bool(hono) and all(v in resolues["@hono/node-server"] for v in hono)
neg = len(resolues["zwadj-paquet-inexistant"]) == 0
print(f"CALIBRATION : avis lus {len(avis)} · occurrences brutes de \"module_name\" {bruts} (attendu égal) · "
      f"lockfile positif {pos} (attendu True, @hono/node-server {hono}) · négatif {neg} (attendu True)")
if len(avis) != bruts or not pos or not neg:
    print("✗ ABANDON — l'extracteur ne rend pas le cas connu"); sys.exit(2)

sev = Counter(a["severity"] for a in avis)
ghsa = {a["github_advisory_id"] for a in avis}
print(f"== outil (metadata.vulnerabilities) : {d['metadata']['vulnerabilities']} · dépendances {d['metadata']['totalDependencies']}")
print(f"== recompté sur les avis : {len(avis)} avis · {dict(sorted(sev.items()))} · {len(ghsa)} GHSA distincts")
print(f"== paquets parcourus dans le lockfile : {len(resolues)} noms · {sum(len(v) for v in resolues.values())} versions")
par_paquet = Counter(a["module_name"] for a in avis)
print("== ventilation par paquet (avis de l'outil, aujourd'hui) :")
for nom, n in sorted(par_paquet.items(), key=lambda x: (-x[1], x[0])):
    print(f"   {nom:28s} {n:3d}")
NOMMES = ["next", "multer", "sharp", "react-router", "hono", "fast-uri", "brace-expansion", "postcss",
          "@hono/node-server", "browserslist", "js-yaml", "mysql2", "nanoid", "qs", "baseline-browser-mapping",
          "deepmerge-ts", "valibot"]
print("== paquets nommés par l'audit sécu du 09/09 — versions RÉSOLUES aujourd'hui (lockfile) · signalées par l'outil :")
for nom in NOMMES:
    signalees = sorted({f["version"] for a in avis if a["module_name"] == nom for f in a["findings"]})
    corr = sorted({a["patched_versions"] for a in avis if a["module_name"] == nom})
    print(f"   {nom:26s} résolues {sorted(resolues[nom]) or '— AUCUNE'} · signalées {signalees or '—'} · "
          f"corrigées selon l'outil {corr or '—'}")
absents = sorted(set(par_paquet) - set(NOMMES))
print(f"== paquets signalés AUJOURD'HUI que l'annexe du 09/09 ne nomme pas : {absents or 'aucun'}")
