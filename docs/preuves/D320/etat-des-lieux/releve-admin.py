"""D320 — état des lieux de l'administration, relevé dans le code (cadrage du rang 28).

POURQUOI IL EXISTE
  Le cadrage de la page d'administration s'appuie sur des faits du code (routes ADMIN, gardes, durée du jeton, cookie,
  CORS, journal, statuts, création d'un ADMIN, parité i18n). Écrits de mémoire, ils seraient des affirmations (D291) ;
  relevés par un script versé, ils se rejouent. Chaque fait sort avec son fichier:ligne et le nombre d'éléments que la
  recherche a parcourus (D290).

USAGE, depuis la racine :  python3 docs/preuves/D320/etat-des-lieux/releve-admin.py > <sortie>   (bash ; D298)

LECTURE SEULE : il lit l'arbre de travail (identique à HEAD hors .md d'autorité et docs/preuves, contrôle T0 de la
  lecture adverse de D320) ; il n'écrit rien.

INSTRUMENTS ÉCARTÉS : l'introspection des routes Nest au démarrage (`rbac-all-routes.int-spec.ts` la fait) exige une
  base PostgreSQL et un amorçage — hors d'un lot documentaire ; le relevé lit donc les DÉCORATEURS dans les sources,
  et se confronte au plancher que cette spec asserte (« ≥ 5 routes ADMIN »).

CALIBRATION : chaque motif doit trouver au moins un cas connu d'avance (bras positif, listé dans CONNUS) et rien dans
  une chaîne témoin qui ne le porte pas (bras négatif) ; abandon si un bras manque.
"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")


def lire(p):
    return open(p, encoding="utf-8").read()


def sources(racine, ext=(".ts", ".tsx")):
    for d, _, fs in os.walk(racine):
        if "node_modules" in d or "generated" in d.replace("\\", "/").split("/"):
            continue
        for f in fs:
            if f.endswith(ext) and not re.search(r"\.(spec|test|int-spec)\.tsx?$", f):
                yield os.path.join(d, f).replace("\\", "/")


def ou(p, motif):
    """[(ligne, texte)] des lignes de p qui portent motif."""
    return [(i + 1, l.strip()) for i, l in enumerate(lire(p).splitlines()) if re.search(motif, l)]


# ---------------------------------------------------------------------------------------------- calibration
CONNUS = [
    ("route ADMIN par décorateur de classe", r"@Roles\(UserRole\.ADMIN\)", "apps/api/src/venues/venues-admin.controller.ts"),
    ("écriture d'AuditLog", r"auditLog\.(create|createMany)\(", None),  # aucun cas connu : bras positif sur témoin
    ("méthode HTTP Nest", r"@(Get|Post|Patch|Put|Delete)\(", "apps/api/src/account/account-admin.controller.ts"),
]
TEMOIN_POS = 'await tx.auditLog.create({ data })'
TEMOIN_NEG = '// le journal auditLog existe ; @Roles("PRO") ; Get le statut'
manques = 0
for nom, motif, fichier in CONNUS:
    pos = bool(ou(fichier, motif)) if fichier else bool(re.search(motif, TEMOIN_POS))
    neg = bool(re.search(motif, TEMOIN_NEG))
    bon = pos and not neg
    manques += not bon
    print(f"  calibration {'✓' if bon else '✗'} {nom} : positif {pos} (attendu True) · négatif {neg} (attendu False)")
print(f"  calibration : {len(CONNUS)} motifs · {manques} manqué(s) (attendu 0)")
if manques:
    sys.exit("CALIBRATION MANQUÉE — abandon")

# ---------------------------------------------------------------------------------------------- 1. routes ADMIN
print("\n== 1. ROUTES ADMIN (décorateurs, sources hors tests)")
api = list(sources("apps/api/src"))
admin_ctrl = [p for p in api if ou(p, r"@Roles\(UserRole\.ADMIN\)|@Roles\(\"ADMIN\"\)|@Roles\([^)]*ADMIN")]
routes = 0
for p in admin_ctrl:
    base = ou(p, r"@Controller\(")
    # premier passage : `@Roles\(` attrapait d'abord un COMMENTAIRE qui cite le décorateur ; seule une ligne qui
    # COMMENCE par le décorateur est un décorateur.
    deco = ou(p, r"^\s*@Roles\(")
    print(f"  {p} — {base[0][1] if base else '?'} ; rôle : {deco[0][1] if deco else '?'} (ligne {deco[0][0] if deco else '?'})")
    for n, l in ou(p, r"^\s*@(Get|Post|Patch|Put|Delete)\("):
        routes += 1
        print(f"     ligne {n:3d} : {l}")
print(f"  ⇒ {len(admin_ctrl)} contrôleur(s) ADMIN, {routes} route(s), sur {len(api)} fichiers source parcourus "
      "(plancher asserté par rbac-all-routes.int-spec.ts : ≥ 5)")

# ---------------------------------------------------------------------------------------------- 2. gardes et rôle
print("\n== 2. GARDES ET VÉRIFICATION DU RÔLE")
for p, motif in (("apps/api/src/app.module.ts", r"APP_GUARD"),
                 ("apps/api/src/auth/auth.types.ts", r"Claims du JWT|role: UserRole"),
                 ("apps/api/src/auth/jwt-auth.guard.ts", r"verifyAsync|request\.user ="),
                 ("apps/api/src/auth/roles.guard.ts", r"requiredRoles\.includes"),
                 ("apps/api/src/auth/auth.service.ts", r"async refresh|user\.status !== \"ACTIVE\"|const payload: AccessTokenPayload"),
                 ("apps/api/src/auth/auth.module.ts", r"JWT_ACCESS_TTL"),
                 ("apps/api/src/config/env.ts", r"JWT_ACCESS_TTL|REFRESH_TOKEN_TTL_DAYS|CORS_ORIGINS|default\(\"http"),
                 ("apps/api/src/config/env.spec.ts", r"toBe\(\"15m\"\)")):
    for n, l in ou(p, motif):
        print(f"  {p}:{n} : {l[:150]}")

# ---------------------------------------------------------------------------------------------- 3. cookie, CORS, fronts
print("\n== 3. COOKIE DE RAFRAÎCHISSEMENT, CORS, ACCÈS DES FRONTS À L'API")
for p, motif in (("apps/api/src/auth/auth.constants.ts", r"REFRESH_COOKIE_(NAME|PATH)"),
                 ("apps/api/src/auth/auth.controller.ts", r"httpOnly|sameSite|secure:|path: AUTH|domain"),
                 ("apps/api/src/main.ts", r"enableCors"),
                 ("apps/client/src/lib/api.ts", r"NEXT_PUBLIC_API_URL"),
                 ("apps/pro/src/lib/auth-client.ts", r"VITE_API_URL"),
                 ("apps/pro/src/auth/require-pro.tsx", r"role !== \"PRO\"|D23")):
    for n, l in ou(p, motif):
        print(f"  {p}:{n} : {l[:150]}")
nc = sum(1 for p in ("apps/client/next.config.ts", "apps/pro/vite.config.ts") if re.search(r"rewrites|proxy", lire(p)))
print(f"  proxy /api dans next.config.ts ou vite.config.ts : {nc} sur 2 fichiers parcourus (0 ⇒ appels DIRECTS, CORS)")
dom = sum(len(ou(p, r"domain\s*:")) for p in api)
print(f"  attribut `domain:` d'un cookie dans les sources API : {dom} sur {len(api)} fichiers (0 ⇒ cookie limité à l'hôte de l'API)")

# ---------------------------------------------------------------------------------------------- 4. création d'un ADMIN
print("\n== 4. CRÉER UN ADMIN — ce que le produit permet")
for p, motif in (("packages/types/src/auth.ts", r"registerSchema|z\.literal\(\"(CLIENT|PRO)\"\)"),
                 ("apps/api/src/auth/auth.service.ts", r"role !== \"CLIENT\" && !user\.emailVerifiedAt|ne produit JAMAIS un PRO/ADMIN")):
    if os.path.exists(p):
        for n, l in ou(p, motif):
            print(f"  {p}:{n} : {l[:150]}")
fab = []
for racine in ("e2e/fixtures", "apps/api/test/int", "apps/api/prisma"):
    for d, _, fs in os.walk(racine):
        for f in fs:
            q = os.path.join(d, f).replace("\\", "/")
            if f.endswith((".ts", ".sql")):
                fab += [(q, n, l) for n, l in ou(q, r"role ?= ?'ADMIN'|role: ?\"ADMIN\"")]
print(f"  fabrications d'un ADMIN hors produit (tests, seed) : {len(fab)}")
for q, n, l in fab[:4]:
    print(f"     {q}:{n} : {l[:120]}")
seed = [p for p in ("apps/api/prisma/seed.ts",) if os.path.exists(p)]
print(f"  seed qui crée un ADMIN : {sum(bool(ou(p, 'ADMIN')) for p in seed)} sur {len(seed)} seed(s) parcouru(s)")

# ---------------------------------------------------------------------------------------------- 5. journal, statuts
print("\n== 5. JOURNAL DES ACTIONS, STATUTS DE PUBLICATION, TRACES EXISTANTES")
sch = "apps/api/prisma/schema.prisma"
for n, l in ou(sch, r"^model AuditLog|action +String|^enum VenuePublicationStatus|^  (DRAFT|PENDING|PUBLISHED)$|decidedById|^enum UserStatus|^  SUSPENDED"):
    print(f"  {sch}:{n} : {l}")
ecr = [(p, n) for p in api for n, _ in ou(p, r"auditLog\.(create|createMany)\(")]
print(f"  écrivains d'AuditLog dans apps/api/src : {len(ecr)} sur {len(api)} fichiers parcourus")
mig = [d for d in os.listdir("apps/api/prisma/migrations") if os.path.isdir(f"apps/api/prisma/migrations/{d}")]
cree = [d for d in mig if "audit_logs" in lire(f"apps/api/prisma/migrations/{d}/migration.sql")]
print(f"  migrations qui créent/touchent audit_logs : {cree} sur {len(mig)} parcourues")
for n, l in ou("apps/api/src/venues/venues-admin.service.ts", r"PENDING inutilis|ONE-WAY|SLOT_TEMPLATE_REQUIRED|data: \{ \.\.\.input \}"):
    print(f"  apps/api/src/venues/venues-admin.service.ts:{n} : {l[:150]}")
rej = sum(len(ou(p, r"reject")) for p in ("apps/api/src/venues/venues-admin.controller.ts", "apps/api/src/venues/venues-admin.service.ts"))
print(f"  « reject » dans le contrôleur et le service des salles ADMIN : {rej} (2 fichiers parcourus)")

# ---------------------------------------------------------------------------------------------- 6. client d'API, i18n, e2e
print("\n== 6. CLIENT D'API PARTAGÉ, PARITÉ i18n, e2e")
ac = list(sources("packages/api-client/src"))
print(f"  « /admin » dans packages/api-client/src : {sum(len(ou(p, r'/admin')) for p in ac)} sur {len(ac)} fichiers parcourus")


def plat(d, pre=""):
    o = {}
    for k, v in d.items():
        q = f"{pre}.{k}" if pre else k
        o.update(plat(v, q) if isinstance(v, dict) else {q: v})
    return o


fr = plat(json.load(open("packages/i18n/messages/fr.json", encoding="utf-8")))
ar = plat(json.load(open("packages/i18n/messages/ar.json", encoding="utf-8")))
print(f"  clés fr.json {len(fr)} · ar.json {len(ar)} · orphelines {len(set(fr) ^ set(ar))} · espace « admin. » "
      f"{sum(k.startswith('admin.') for k in fr)}")
for n, l in ou("apps/api/src/common/i18n-parity.spec.ts", r"MESSAGES_DIR =|toEqual\(\{ frOnly|v\.trim\(\) === \"\"|toBeGreaterThanOrEqual"):
    print(f"  apps/api/src/common/i18n-parity.spec.ts:{n} : {l[:150]}")
for n, l in ou("e2e/playwright.config.ts", r"command: |_PORT ="):
    print(f"  e2e/playwright.config.ts:{n} : {l[:150]}")
print("\nFIN DU RELEVÉ")
