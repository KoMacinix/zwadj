#!/usr/bin/env python3
"""D349 (rang 51, ADM-1) — l'ÉTAT DES LIEUX du § 1 du cadrage du rang 28, RE-MESURÉ à `9ec8abf`.

Consigne du relecteur, section 2 : « L'état des lieux du § 1 date du 01/10/2026 : RE-MESURE-le à 9ec8abf avant d'écrire, pièce versée. »
Lecture seule : ce script n'écrit RIEN dans le dépôt (sauf `--sortie`, qui écrit la pièce versée, en UTF-8, LF).

Usage, depuis la RACINE du monorepo :
    python3 docs/preuves/D349/etat-des-lieux/releve.py --sortie docs/preuves/D349/etat-des-lieux/releve-sortie.txt

POURQUOI IL EXISTE : le § 1 du cadrage (D320) est un relevé du 01/10/2026 ; entre-temps dix-sept lots sont passés (D321 à D348). Un état des lieux
qu'on ne rejoue pas est une affirmation datée (D286). Chaque ligne imprime son MESURÉ, ce qu'elle a PARCOURU, et l'ATTENDU à côté (D290) : un
zéro sur zéro fichier parcouru n'est pas une mesure.
INSTRUMENTS ÉCARTÉS : `docs/preuves/D320/etat-des-lieux/releve-admin.py` (celui de D320) — il vise le dépôt du 01/10/2026 et ses numéros de ligne ;
le rejouer ici aurait comparé deux définitions différentes de « une route ». Celui-ci COMPTE à sa façon, et le dit.
CALIBRATION (deux bras, jouée à CHAQUE lancement, l'instrument ABANDONNE si un cas manque son verdict) :
  · bras positif — `apps/api/src/account/account-admin.controller.ts` doit être trouvé comme contrôleur ADMIN avec 3 routes ;
  · bras négatif — `apps/api/src/venues/venues.controller.ts` (classe `@Roles(UserRole.PRO)`) ne doit PAS l'être.
"""
import hashlib
import os
import re
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)

SORTIE = None
for a in sys.argv[1:]:
    if a.startswith("--sortie="):
        SORTIE = a.split("=", 1)[1]
if "--sortie" in sys.argv:
    SORTIE = sys.argv[sys.argv.index("--sortie") + 1]

LIGNES: list[str] = []


def dire(texte: str = "") -> None:
    LIGNES.append(texte)
    print(texte)


def lire(chemin: str) -> str:
    with open(chemin, "rb") as f:
        return f.read().decode("utf-8").replace("\r\n", "\n")


def fichiers(racine: str, extensions: tuple[str, ...], exclure: tuple[str, ...] = ("generated", "node_modules", "dist", ".next")) -> list[str]:
    sortie = []
    for dossier, sous, noms in os.walk(racine):
        sous[:] = [d for d in sous if d not in exclure]
        for n in noms:
            if n.endswith(extensions):
                sortie.append(os.path.join(dossier, n).replace("\\", "/"))
    return sorted(sortie)


def est_test(chemin: str) -> bool:
    return bool(re.search(r"\.(spec|test|int-spec)\.tsx?$", chemin)) or "/test/" in chemin or "/test-support/" in chemin


# ── le contrôleur ADMIN : `@Roles(UserRole.ADMIN)` AU NIVEAU DE LA CLASSE (D119), puis ses routes ────────────────────────────────────────────────
ROUTE = re.compile(r"@(Get|Post|Patch|Put|Delete)\(\s*(?:\"([^\"]*)\")?\s*\)")
CLASSE_ADMIN = re.compile(r"@Roles\(UserRole\.ADMIN\)\s*(?:@\w+\([^)]*\)\s*)*@Controller\(\s*\"([^\"]*)\"\s*\)")


def controleur_admin(chemin: str):
    t = lire(chemin)
    m = CLASSE_ADMIN.search(t)
    if not m:
        return None
    routes = [(v.upper(), (p or "")) for v, p in ROUTE.findall(t)]
    return m.group(1), routes


def calibrer() -> bool:
    ok = True
    pos = controleur_admin("apps/api/src/account/account-admin.controller.ts")
    attendu_pos = pos is not None and len(pos[1]) == 3
    dire(f"  calibration · bras positif  account-admin.controller.ts → {'contrôleur ADMIN, ' + str(len(pos[1])) + ' routes' if pos else 'NON TROUVÉ'} (attendu : contrôleur ADMIN, 3 routes) · {'✓' if attendu_pos else '✗'}")
    neg = controleur_admin("apps/api/src/venues/venues.controller.ts")
    attendu_neg = neg is None
    dire(f"  calibration · bras négatif  venues.controller.ts → {'trouvé (FAUX)' if neg else 'absent'} (attendu : absent) · {'✓' if attendu_neg else '✗'}")
    return attendu_pos and attendu_neg


dire("D349 — état des lieux du § 1 du cadrage du rang 28, RE-MESURÉ")
sha = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
sha_origin = subprocess.run(["git", "rev-parse", "origin/main"], capture_output=True, text=True).stdout.strip()
dire(f"HEAD = {sha}")
dire(f"origin/main = {sha_origin}")
dire(f"empreinte de ce script : {hashlib.sha256(open(__file__, 'rb').read()).hexdigest()}")
dire("")
dire("[0] CALIBRATION")
if not calibrer():
    dire("✗ CALIBRATION MANQUÉE : l'instrument ABANDONNE (aucune mesure ci-dessous n'est à croire).")
    if SORTIE:
        open(SORTIE, "wb").write(("\n".join(LIGNES) + "\n").encode("utf-8"))
    sys.exit(2)

# ── 1.1 les routes ADMIN ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
src = [f for f in fichiers("apps/api/src", (".ts",)) if not est_test(f)]
dire("")
dire(f"[1.1] CONTRÔLEURS ADMIN — fichiers source de l'API parcourus (hors tests, hors generated) : {len(src)}")
total_routes = 0
trouves = []
for f in src:
    c = controleur_admin(f)
    if c:
        trouves.append((f, c))
for f, (base, routes) in trouves:
    dire(f"  {f}  @Controller(\"{base}\")  @Roles(UserRole.ADMIN) de classe")
    for verbe, p in routes:
        total_routes += 1
        chemin = "/".join(s for s in (base, p) if s)
        dire(f"      {verbe} /api/v1/{chemin}")
dire(f"  MESURÉ : {len(trouves)} contrôleur(s) ADMIN, {total_routes} route(s) · PARCOURU : {len(src)} fichiers · ATTENDU : 2 contrôleurs, 5 routes (consigne, section 2)")
rbac = "apps/api/test/int/rbac-all-routes.int-spec.ts"
dire(f"  {rbac} existe : {os.path.isfile(rbac)} (attendu : True) · plancher des routes admin qu'il asserte : "
     + ", ".join(re.findall(r"expect\(admin\.length\)\.toBeGreaterThan(?:OrEqual)?\((\d+)\)", lire(rbac))))

# ── les écrivains d'`audit_logs` ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
dire("")
ECRIT_AUDIT = re.compile(r"auditLog\s*\.\s*(create|createMany|upsert|update|updateMany)\b|audit_logs")
dire("[1.4] ÉCRIVAINS D'`audit_logs` dans apps/api/src (hors tests, hors generated)")
ecrivains = []
for f in src:
    t = lire(f)
    for i, l in enumerate(t.split("\n"), 1):
        if re.search(r"auditLog\s*\.\s*(create|createMany|upsert|update|updateMany)\b", l):
            ecrivains.append((f, i, l.strip()))
for f, i, l in ecrivains:
    dire(f"  {f}:{i}  {l[:110]}")
dire(f"  MESURÉ : {len(ecrivains)} appel(s) d'écriture dans {len({f for f, _, _ in ecrivains})} fichier(s) : {sorted({os.path.basename(f) for f, _, _ in ecrivains})} · PARCOURU : {len(src)} fichiers · ATTENDU : staff-store.prisma.ts et quote-store.prisma.ts, AUCUN pour publier / rejeter / approuver / rejeter une suppression")
admin_ecrit = [f for f, _, _ in ecrivains if "venues-admin" in f or "account-deletion" in f]
dire(f"  écrivains dans venues-admin.* ou account-deletion.* : {len(admin_ecrit)} (attendu : 0)")

# ── @zwadj/api-client : les méthodes `admin/` ────────────────────────────────────────────────────────────────────────────────────────────────
cli = [f for f in fichiers("packages/api-client/src", (".ts", ".tsx")) if not est_test(f)]
occ = []
for f in cli:
    for i, l in enumerate(lire(f).split("\n"), 1):
        if re.search(r"[\"'`]/admin(/|[\"'`])", l):
            occ.append((f, i, l.strip()))
dire("")
dire(f"[1.4] @zwadj/api-client — fichiers parcourus (hors tests) : {len(cli)}")
for f, i, l in occ:
    dire(f"  {f}:{i}  {l[:110]}")
dire(f"  MESURÉ : {len(occ)} chemin(s) `/admin…` · PARCOURU : {len(cli)} fichiers · ATTENDU : 0")

# ── apps/pro/src : un dossier `admin` ? ──────────────────────────────────────────────────────────────────────────────────────────────────────
dossiers = []
nb_dossiers = 0
for d, sous, _ in os.walk("apps/pro/src"):
    sous[:] = [s for s in sous if s not in ("node_modules", "dist")]
    for s in sous:
        nb_dossiers += 1
        if s.lower() == "admin":
            dossiers.append(os.path.join(d, s).replace("\\", "/"))
pro = fichiers("apps/pro/src", (".ts", ".tsx"))
refs = []
for f in pro:
    for i, l in enumerate(lire(f).split("\n"), 1):
        if re.search(r"[\"'`]/admin\b", l) or re.search(r"role\s*[!=]==?\s*[\"']ADMIN[\"']", l):
            refs.append((f, i, l.strip()))
dire("")
dire(f"[1.3] apps/pro/src — dossiers parcourus : {nb_dossiers} ; fichiers .ts/.tsx : {len(pro)}")
dire(f"  MESURÉ : dossier(s) `admin` : {len(dossiers)} {dossiers} · ATTENDU : 0")
for f, i, l in refs:
    dire(f"  référence `/admin` ou rôle ADMIN : {f}:{i}  {l[:110]}")
dire(f"  MESURÉ : {len(refs)} référence(s) · PARCOURU : {len(pro)} fichiers · ATTENDU : le refus de tout rôle ≠ PRO de `require-pro.tsx` (D23) ; aucune route `/admin`")

# ── la colonne `rejection_reason` : migration, schéma, écrivains, lecteurs ───────────────────────────────────────────────────────────────────
dire("")
init = "apps/api/prisma/migrations/20260707000000_init/migration.sql"
t = lire(init)
dire(f"[D-4] `rejection_reason` — migration initiale lue : {init} ({len(t.split(chr(10)))} lignes)")
for i, l in enumerate(t.split("\n"), 1):
    if "rejection_reason" in l:
        dire(f"  {init}:{i}  {l.strip()[:110]}")
sch = lire("apps/api/prisma/schema.prisma").split("\n")
for i, l in enumerate(sch, 1):
    if "rejectionReason" in l or "rejection_reason" in l:
        dire(f"  apps/api/prisma/schema.prisma:{i}  {l.strip()[:120]}")
mig_autres = []
for f in fichiers("apps/api/prisma/migrations", (".sql",)):
    if f.endswith("20260707000000_init/migration.sql"):
        continue
    if "rejection_reason" in lire(f):
        mig_autres.append(f)
dire(f"  autres migrations qui nomment `rejection_reason` : {len(mig_autres)} {mig_autres} (parcourues : {len(fichiers('apps/api/prisma/migrations', ('.sql',))) - 1})")
ECR_REJ = re.compile(r"rejectionReason\s*:")
usages = []
for f in src:
    for i, l in enumerate(lire(f).split("\n"), 1):
        if "rejectionReason" in l:
            usages.append((f, i, l.strip()))
for f, i, l in usages:
    genre = "ÉCRITURE ?" if ECR_REJ.search(l) and "true" not in l else "mention"
    dire(f"  {f}:{i}  [{genre}] {l[:110]}")
ecr = [u for u in usages if ECR_REJ.search(u[2]) and "true" not in u[2] and not u[2].startswith(("//", "*", "/*"))]
dire(f"  MESURÉ : {len(usages)} mention(s) de `rejectionReason` dans {len(src)} fichiers source, dont {len(ecr)} écriture(s) en code (`rejectionReason: <valeur>`) · ATTENDU : colonne présente depuis la migration initiale, AUCUN écrivain")

# ── la carte du chemin de l'argent (D304) : `venues-admin.service.ts` y figure-t-il ? ────────────────────────────────────────────────────────
carte = "docs/preuves/D304/carte-chemin-argent/carte-sortie.txt"
ct = lire(carte)
dans = [l.strip() for l in ct.split("\n") if "venues-admin" in l or "venue.ts" in l]
dire("")
dire(f"[R-1] la carte du chemin de l'argent — {carte} ({len(ct.split(chr(10)))} lignes parcourues)")
for l in dans:
    dire(f"  {l}")
tri = "docs/preuves/D304/carte-chemin-argent/tri.txt"
for i, l in enumerate(lire(tri).split("\n"), 1):
    if "venues-admin" in l:
        dire(f"  {tri}:{i}  {l.strip()[:150]}")
dire(f"  MESURÉ : {len(dans)} ligne(s) de la carte qui nomment `venues-admin.service.ts` ou `venue.ts` · ATTENDU : le relecteur n'a pas relevé cette entrée (la clause d'ARRÊT de R-1 vise « un fichier de la carte »)")

# ── la clé qui rend les deux fichiers de par-carte ───────────────────────────────────────────────────────────────────────────────────────────
dire("")
dire("[fin] relevé terminé")
if SORTIE:
    open(SORTIE, "wb").write(("\n".join(LIGNES) + "\n").encode("utf-8"))
    print(f"→ pièce écrite : {SORTIE}")
