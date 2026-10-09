#!/usr/bin/env python3
"""
D327 — RANG 34, RELEVÉ n° 5 : INVENTAIRE DES ROUTES — existe-t-il un écran ou une route qui LISTE ou CHERCHE des clients ? (pièce versée ; lot DOCUMENTAIRE, lecture seule).

POURQUOI : « tout écran ou route qui liste ou cherche des clients » ne se répond pas par l'absence d'un grep qui n'a rien trouvé : on énumère TOUTES les routes (API : les décorateurs des contrôleurs ; app Pro : les `<Route path=…>` de
`apps/pro/src/App.tsx`), puis on regarde lesquelles portent un mot de client, lesquelles portent des données de contact, et lesquelles acceptent un paramètre de recherche. Les comptes s'impriment avec ce qu'ils ont PARCOURU (D290).

USAGE, depuis la RACINE : python3 docs/preuves/D327/releve/clients-pro/inventaire-routes.py > docs/preuves/D327/releve/clients-pro/inventaire-routes.txt   (bash, jamais PowerShell : D298)
LECTURE SEULE sur l'arbre de travail (= la clôture de D326 : `git status` propre à l'ouverture de ce lot).

CALIBRATION, deux bras, ABANDON si un seul manque (D286) : l'analyseur de contrôleur — POSITIF : un contrôleur à préfixe (`@Controller("auth")` + `@Post("login")`) rend la route `POST /auth/login` ; un contrôleur SANS préfixe + `@Get("pro/venues/:id/quotes")` rend
`GET /pro/venues/:id/quotes` ; NÉGATIF : un fichier sans décorateur rend ZÉRO route. Et sur le dépôt : le nombre de contrôleurs lus (23, relevé par `grep -rl "@Controller"`) doit être celui que le script parcourt.
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

VERBES = ("Get", "Post", "Put", "Patch", "Delete")


def routes_du_controleur(texte):
    """[(VERBE, chemin, rôles)] d'un fichier de contrôleur : préfixe de `@Controller(...)`, puis chaque `@Verbe(...)` ; les rôles sont ceux de `@Roles(...)` au niveau de la classe ou de la méthode (le plus proche au-dessus)."""
    m = re.search(r"@Controller\(\s*(?:\"([^\"]*)\")?\s*\)", texte)
    if not m:
        return []
    prefixe = (m[1] or "").strip("/")
    roles_classe = None
    cm = re.search(r"((?:@\w+\([^)]*\)\s*)*)@Controller", texte)
    if cm:
        rc = re.search(r"@Roles\(([^)]*)\)", cm[1])
        roles_classe = rc[1] if rc else None
    sortie = []
    for mm in re.finditer(r"((?:\s*@\w+\((?:[^()]|\([^()]*\))*\))*)\s*@(" + "|".join(VERBES) + r")\(\s*(?:\"([^\"]*)\")?\s*\)", texte):
        bloc_avant = mm[1]
        rm = re.search(r"@Roles\(([^)]*)\)", bloc_avant)
        chemin = "/".join(p for p in (prefixe, (mm[3] or "").strip("/")) if p)
        sortie.append((mm[2].upper(), "/" + chemin, (rm[1] if rm else roles_classe) or "—"))
    return sortie


def chemins_routes(texte):
    """Les chemins des `<Route path=…>` d'un fichier TSX, commentaires retirés (`/* … */`, `{/* … */}`, `// …`) : un `<Route path="*">` CITÉ dans un commentaire n'est pas une route. Un chemin est un littéral (`path="/demandes"`)
    ou une constante (`path={LOGIN_PATH}`, rendue `{LOGIN_PATH}`) : les deux se lisent."""
    t = re.sub(r"/\*.*?\*/", "", texte, flags=re.S)
    t = "\n".join(re.sub(r"(?<![:\"'])//.*$", "", ligne) for ligne in t.split("\n"))
    return [a or ("{" + b + "}") for a, b in re.findall(r'<Route\s+(?:[^>]*?\s)?path=(?:"([^"]+)"|\{(\w+)\})', t, flags=re.S)]


# ══ CALIBRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("positif · contrôleur à préfixe", routes_du_controleur('@Controller("auth")\nexport class A {\n  @Post("login")\n  login() {}\n}'), [("POST", "/auth/login", "—")])
bras("positif · contrôleur sans préfixe + rôle de classe", routes_du_controleur('@Roles(UserRole.PRO)\n@Controller()\nexport class B {\n  @Get("pro/venues/:id/quotes")\n  l() {}\n}'), [("GET", "/pro/venues/:id/quotes", "UserRole.PRO")])
bras("négatif · un fichier sans décorateur", routes_du_controleur("export class C { get() {} }"), [])
bras("positif · routes d'une app : un littéral, une constante", chemins_routes('<Route path="/a" element={<A />} />\n<Route\n  path={LOGIN_PATH}\n  element={<L />}\n/>'), ["/a", "{LOGIN_PATH}"])
bras("négatif · un `<Route path=\"*\">` cité dans un commentaire (de ligne ou de bloc) n'est pas une route", chemins_routes('// le `<Route path="*">` redirigeait\n/* <Route path="/b" /> */\n<Route path="/c" element={x} />'), ["/c"])
fichiers = subprocess.run(["git", "ls-files", "apps/api/src"], capture_output=True, check=True).stdout.decode().split("\n")
controleurs = [f for f in fichiers if f.endswith(".controller.ts")]
attendu = len(subprocess.run(["grep", "-rl", "@Controller", "apps/api/src", "--include=*.controller.ts"], capture_output=True).stdout.decode().split())
bras("sur le dépôt · contrôleurs parcourus = contrôleurs trouvés par `grep -rl @Controller`", len(controleurs), attendu)
if not all(cal):
    sys.exit(f"CALIBRATION : {cal.count(False)} bras manqué(s) — l'instrument ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

# ══ L'API ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
toutes = []
for f in controleurs:
    for v, c, r in routes_du_controleur(open(f, encoding="utf-8").read()):
        toutes.append((v, c, r, f))
print(f"== API : {len(controleurs)} contrôleurs parcourus · {len(toutes)} routes")
mots = re.compile(r"client|customer|contact|search|recherche|annuaire", re.I)
for v, c, r, f in sorted(toutes, key=lambda t: t[1]):
    marque = "  ◄ mot de client / contact / recherche" if mots.search(c) else ""
    print(f"   {v:6} {c:58} {r:28}{marque}")
avec_mot = [(v, c) for v, c, _, _ in toutes if mots.search(c)]
print(f"\n   routes dont le CHEMIN porte « client / customer / contact / search / recherche / annuaire » : {len(avec_mot)} → {avec_mot}")
print("   (le chemin d'une route d'un compte CLIENT, `me/...`, est le seul endroit où le mot rôle apparaît : ce sont les réservations du client connecté, pas une liste de clients du pro)")
me = [(v, c) for v, c, _, _ in toutes if c.startswith("/me/")]
print(f"   routes `/me/…` (le compte CLIENT lit ses PROPRES données) : {len(me)} → {me}")

# Les routes qui renvoient du CONTACT au pro : les DTO qui portent contactFirstName / contactPhone.
dto = subprocess.run(["grep", "-rn", "contactFirstName", "packages/types/src", "--include=*.ts"], capture_output=True).stdout.decode().split("\n")
print("\n== DTO qui portent un CONTACT (packages/types/src) : " + "; ".join(sorted({l.split(":")[0] + ":" + l.split(":")[1] for l in dto if l and ".test." not in l})))

# Paramètres de recherche : @Query sur les routes PRO.
requetes = []
for f in controleurs:
    t = open(f, encoding="utf-8").read()
    for m in re.finditer(r"@Query\(([^)]*)\)", t):
        requetes.append((f.split("/")[-1], m[1][:60]))
print(f"\n== @Query lus : {len(requetes)} dans {len(set(f for f, _ in requetes))} contrôleurs ; ceux des contrôleurs de la zone PRO (bookings-pro, quotes, visit-bookings, venues) :")
for f, q in requetes:
    if f in ("bookings-pro.controller.ts", "quotes.controller.ts", "visit-bookings.controller.ts", "venues.controller.ts", "availability-blocks.controller.ts"):
        print(f"   {f} : @Query({q})")

# ══ L'APP PRO ══════════════════════════════════════════════════════════════════════════════════════════════════════════
chemins = chemins_routes(open("apps/pro/src/App.tsx", encoding="utf-8").read())
print(f"\n== APP PRO : {len(chemins)} routes déclarées dans apps/pro/src/App.tsx : {chemins}")
print(f"   routes qui portent « client » : {[c for c in chemins if 'client' in c.lower()]}")
nav = open("apps/pro/src/shell/pro-nav.tsx", encoding="utf-8").read()
cles = re.findall(r"key:\s*\"(\w+)\"|to:\s*\"([^\"]+)\"", nav)
print(f"   entrées de la navigation (pro-nav.tsx) : {[a or b for a, b in cles]}")
hdr = open("apps/pro/src/shell/pro-header.tsx", encoding="utf-8").read()
print("   entrées du menu de compte (pro-header.tsx) : " + str(re.findall(r'key: "([a-z-]+)"', hdr)))
print("\n== FIN — parcouru : %d contrôleurs, %d routes d'API, %d routes de l'app Pro" % (len(controleurs), len(toutes), len(chemins)))
