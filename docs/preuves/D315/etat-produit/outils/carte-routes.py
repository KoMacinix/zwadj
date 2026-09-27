"""D315 — rang 24 — CARTE DES ÉCRANS ET DES ROUTES, relevée dans le code à HEAD. Pièce jetable, versée. N'écrit rien.
Trois relevés, chacun avec ce qu'il a parcouru (D290) :
  1. apps/client (Next.js, App Router) : chaque `page.tsx` sous `src/app/`, traduit en chemin d'URL (segments
     `(groupe)` retirés, `[param]` gardé) ; les fichiers spéciaux (`layout`, `loading`, `not-found`) listés à part.
  2. apps/pro (react-router) : chaque `<Route path=… element={… <Composant …>}>` de `src/App.tsx`, avec la garde
     (`RequireProSession`, `RedirectIfSession` ou aucune).
  3. apps/api (NestJS) : chaque méthode décorée `@Get/@Post/@Patch/@Put/@Delete` des `*.controller.ts`, préfixée
     par `api/v1` (`app.setup.ts`) et par le chemin de `@Controller(…)` ; le rôle est celui de la méthode s'il existe,
     sinon celui de la classe ; `@Public()` est relevé.
Calibration, deux bras : (+) `venues-admin.controller.ts` doit rendre `POST api/v1/admin/venues/:id/publish` en ADMIN ;
(−) aucune route relevée ne porte un préfixe de contrôleur vide ET un chemin vide (ce serait un décorateur mal lu).
Usage, depuis la racine :  python docs/preuves/D315/etat-produit/outils/carte-routes.py
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)
fichiers = [l for l in subprocess.run(["git", "ls-files"], capture_output=True, text=True, encoding="utf-8").stdout.splitlines() if l]
print(f"HEAD : {subprocess.run(['git', 'rev-parse', '--short=7', 'HEAD'], capture_output=True, text=True).stdout.strip()} · fichiers suivis parcourus : {len(fichiers)}")

# ------------------------------------------------------------------ 1. client
print("\n== 1. apps/client — pages (App Router)")
racine = "apps/client/src/app/"
pages = sorted(f for f in fichiers if f.startswith(racine) and re.search(r"/page\.tsx$", f))
speciaux = sorted(f for f in fichiers if f.startswith(racine) and re.search(r"/(layout|loading|not-found|error|template)\.tsx$", f))
for f in pages:
    segs = [s for s in f[len(racine):].split("/")[:-1] if not (s.startswith("(") and s.endswith(")"))]
    print(f"  /{'/'.join(segs):45s} ← {f}")
print(f"  parcouru : {len(pages)} page(s)")
for f in speciaux:
    print(f"  (spécial) {f}")

# ------------------------------------------------------------------ 2. pro
print("\n== 2. apps/pro — routes (src/App.tsx)")
app = open("apps/pro/src/App.tsx", encoding="utf-8").read()
routes = re.findall(r"<Route\s+path=\"([^\"]+)\"\s+element=\{(.*?)\}\s*/>", app, re.S)
for chemin, el in routes:
    garde = "RequireProSession" if "RequireProSession" in el else ("RedirectIfSession" if "RedirectIfSession" in el else "aucune")
    comp = [c for c in re.findall(r"<([A-Z]\w+)", el) if c not in ("RequireProSession", "RedirectIfSession")]
    print(f"  {chemin:28s} garde {garde:18s} écran {', '.join(comp)}")
print(f"  parcouru : {len(routes)} route(s)")

# ------------------------------------------------------------------ 3. api
print("\n== 3. apps/api — routes HTTP (préfixe api/v1)")
ctrl = sorted(f for f in fichiers if f.startswith("apps/api/src/") and f.endswith(".controller.ts"))
DEC = re.compile(r"@(Get|Post|Patch|Put|Delete)\(\s*(?:\"([^\"]*)\"|'([^']*)')?\s*\)")
total, calib, calib_visites = 0, False, False
for f in ctrl:
    src = open(f, encoding="utf-8").read()
    sans_commentaires = re.sub(r"//[^\n]*|/\*.*?\*/", "", src, flags=re.S)
    m = re.search(r"((?:@\w+\([^)]*\)\s*)*)@Controller\(\s*(?:\"([^\"]*)\")?\s*\)\s*export class (\w+)", sans_commentaires, re.S)
    if not m:
        print(f"  ✗ {f} : @Controller non lu")
        continue
    avant_classe, prefixe, classe = m.group(1), m.group(2) or "", m.group(3)
    role_classe = re.search(r"@Roles\(([^)]*)\)", avant_classe)
    public_classe = "@Public()" in avant_classe
    corps = sans_commentaires[m.end():]
    blocs = re.split(r"\n\s*\n", corps)
    print(f"  -- {classe} ({f}) : @Controller(\"{prefixe}\"), rôle de classe {role_classe.group(1) if role_classe else '—'}{' · @Public' if public_classe else ''}")
    # ⚠ PREMIÈRE VERSION DÉFECTUEUSE, réparée et rejouée (D298) : elle prenait le premier `mot(` après le décorateur pour
    #   le nom de méthode (rendait « ApiOperation », « HttpCode ») et ne voyait pas un `@Roles` posé APRÈS `@Get` — la
    #   route pro des visites sortait « CLIENT ». Le bloc de décorateurs d'une méthode est désormais borné par la fin de
    #   la méthode précédente (« \n  } » ou « {} ») et par SA signature (ligne indentée de deux espaces, minuscule).
    SIG = re.compile(r"^  (?:async\s+)?([a-z]\w*)\s*\(", re.M)
    for mo in DEC.finditer(corps):
        verbe, chemin = mo.group(1).upper(), mo.group(2) or mo.group(3) or ""
        sig = SIG.search(corps, mo.end())
        debut = max(corps.rfind("\n  }", 0, mo.start()), corps.rfind("{}", 0, mo.start()), 0)
        bloc = corps[debut:sig.start() if sig else mo.end()]
        meth = sig
        role_m = re.search(r"@Roles\(([^)]*)\)", bloc)
        pub = "@Public()" in bloc or public_classe
        role = role_m.group(1) if role_m else (role_classe.group(1) if role_classe else ("PUBLIC" if pub else "authentifié, sans @Roles"))
        if pub and not role_m:
            role = "PUBLIC"
        url = "/".join(p for p in ("api/v1", prefixe.strip("/"), chemin.strip("/")) if p)
        if not prefixe and not chemin:
            print(f"  ✗ route à préfixe ET chemin vides dans {f}")
        total += 1
        if f.endswith("venues-admin.controller.ts") and verbe == "POST" and url == "api/v1/admin/venues/:id/publish" and "ADMIN" in role:
            calib = True
        print(f"     {verbe:6s} /{url:62s} {role:28s} {meth.group(1) if meth else '?'}")
        if verbe == "GET" and url == "api/v1/pro/venues/:id/visit-bookings":
            calib_visites = "PRO" in role and meth and meth.group(1) != "Roles"
print(f"  parcouru : {len(ctrl)} contrôleur(s), {total} route(s)")
print(f"\ncalibration (+) POST /api/v1/admin/venues/:id/publish en ADMIN : {'✓' if calib else '✗'}")
print(f"calibration (+) GET /api/v1/pro/venues/:id/visit-bookings en PRO — `@Roles` posé après `@Get`, le cas qui a mordu : "
      f"{'✓' if calib_visites else '✗'}")
if not (calib and calib_visites):
    sys.exit(2)
