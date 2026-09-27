"""D315 — rang 24 — CE QUI BLOQUE UN DÉPLOIEMENT, confronté au CODE à un commit donné. Pièce jetable, versée. N'écrit rien.
Chaque constat est une recherche mécanique sur les fichiers SUIVIS au commit lu (`git show`), qui imprime ce qu'elle a
parcouru et ce qu'elle a trouvé, avec la ligne quand il y en a une (D290). Elle ne juge pas la gravité et ne classe rien :
elle dit « présent » ou « absent », et où. Les constats viennent du backlog (reports de D302, phases 13, 14, 16, 17, 21)
et des captures de ce lot ; ils sont REJOUÉS ici contre le code, pas recopiés.
Calibration, deux bras, sur des textes SYNTHÉTIQUES dont la réponse est connue : chaque détecteur réutilisé plus bas doit
trouver son motif dans un texte qui le porte et ne rien trouver dans un texte qui ne le porte pas ; un bras manqué ⇒
abandon (D286).
Usage, depuis la racine :  python docs/preuves/D315/etat-produit/outils/verifier-deploiement.py [SHA]   (défaut : HEAD)
"""
import json
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sha = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
court = subprocess.run(["git", "rev-parse", "--short=7", sha], capture_output=True, text=True).stdout.strip()
suivis = [l for l in subprocess.run(["git", "ls-tree", "-r", "--name-only", sha], capture_output=True, text=True,
                                    encoding="utf-8").stdout.splitlines() if l]


def lire(chemin: str) -> str:
    r = subprocess.run(["git", "show", f"{sha}:{chemin}"], capture_output=True)
    return r.stdout.decode("utf-8", errors="replace") if r.returncode == 0 else ""


SOURCES = [f for f in suivis if re.search(r"\.(ts|tsx|mjs|cjs|js|json|prisma)$", f) and not f.startswith("docs/")
           and "/generated/" not in f and "node_modules" not in f]
CODE = [f for f in SOURCES if not re.search(r"\.(test|spec|int-spec|e2e)\.|/test/|__fixtures__", f) and not f.startswith("e2e/")]
texte = {f: lire(f) for f in CODE}
print(f"commit {court} · fichiers suivis {len(suivis)} · sources de code parcourues (hors tests, docs, générés) {len(CODE)} · "
      f"lignes {sum(t.count(chr(10)) + 1 for t in texte.values())}")


def cherche(motif: str, dans=None, drapeaux=0):
    rx = re.compile(motif, drapeaux)
    trouve = []
    for f in (dans if dans is not None else CODE):
        for i, l in enumerate(texte.get(f, lire(f)).splitlines(), start=1):
            if rx.search(l):
                trouve.append(f"{f}:{i}: {l.strip()[:110]}")
    return trouve


EN_TETES = r"Strict-Transport-Security|Content-Security-Policy|X-Frame-Options|nosniff|Referrer-Policy|Permissions-Policy|\bhelmet\b"
# ------------------------------------------------------------------ calibration
cal = [("en-têtes, positif", re.search(EN_TETES, 'res.setHeader("Strict-Transport-Security", "max-age=1")') is not None, True),
       ("en-têtes, négatif", re.search(EN_TETES, "app.enableCors({ origin })") is not None, False),
       ("robots/sitemap, positif", re.search(r"(^|/)(robots|sitemap)\.(ts|tsx|txt|xml)$", "apps/client/src/app/robots.ts") is not None, True),
       ("robots/sitemap, négatif", re.search(r"(^|/)(robots|sitemap)\.(ts|tsx|txt|xml)$", "apps/client/src/app/not-found.tsx") is not None, False),
       ("relecture faite, positif", re.search(r"(clés|arabe)[^.\n]{0,60}\b(relues|relu|validées?)\s+par\s+(un|une|Ko|le)\b", "les 16 clés arabes relues par un locuteur natif") is not None, True),
       ("relecture faite, négatif", re.search(r"(clés|arabe)[^.\n]{0,60}\b(relues|relu|validées?)\s+par\s+(un|une|Ko|le)\b", "~136 clés arabes ne sont pas relues") is not None, False)]
manques = [n for n, m, a in cal if m != a]
for n, m, a in cal:
    print(f"calibration {n} : {m} (attendu {a})")
if manques:
    print(f"✗ ABANDON : bras manqués {manques}")
    sys.exit(2)

n = 0


def constat(titre: str, lignes, attendu_si_present: str, attendu_si_absent: str):
    global n
    n += 1
    etat = attendu_si_present if lignes else attendu_si_absent
    print(f"\n[{n}] {titre} — {etat} ({len(lignes)} occurrence(s))")
    for l in lignes[:8]:
        print(f"     {l}")
    if len(lignes) > 8:
        print(f"     … {len(lignes) - 8} de plus")


print("\n== SÉCURITÉ")
constat("en-têtes de sécurité HTTP ou helmet, dans le code des trois applications", cherche(EN_TETES), "PRÉSENTS", "ABSENTS")
constat("« trust proxy » configuré (API)", cherche(r"trust proxy|trustProxy", [f for f in CODE if f.startswith("apps/api/")]),
        "PRÉSENT — lire le contexte (une note n'est pas une configuration)", "ABSENT")
constat("Swagger monté (API) — et sous quelle condition", cherche(r"SwaggerModule\.setup|NODE_ENV", ["apps/api/src/main.ts"]),
        "voir les lignes : un `NODE_ENV` voisin du montage dirait une condition", "ABSENT")
constat("MFA / TOTP / WebAuthn", cherche(r"(?i)\btotp\b|webauthn|two.?factor|\bmfa\b"), "PRÉSENT", "ABSENT")
gi = lire(".gitignore")
constat("`.gitignore` : motifs qui couvrent `.env.production` / `.env.staging`",
        [f".gitignore:{i}: {l}" for i, l in enumerate(gi.splitlines(), 1) if re.match(r"^\.env(\*|\..*\*|\.production|\.staging)?$", l.strip())],
        "voir les motifs", "AUCUN")

print("\n== CONFIGURATION DE PRODUCTION")
constat("adaptateur e-mail lié par `EmailModule`", cherche(r"useClass|NODE_ENV", ["apps/api/src/common/email/email.module.ts"]), "voir", "—")
constat("adaptateur WhatsApp lié par `WhatsAppModule`", cherche(r"useClass|NODE_ENV", ["apps/api/src/common/whatsapp/whatsapp.module.ts"]), "voir", "—")
constat("adaptateurs d'e-mail / WhatsApp / stockage AUTRES que le journal de dev et le disque",
        [f for f in suivis if re.search(r"apps/api/src/(common/(email|whatsapp)|media)/[^/]+\.(adapter|email|whatsapp|sender)\.ts$", f)
         and not re.search(r"dev-logger|disk-storage", f)], "PRÉSENTS", "AUCUN — seuls `dev-logger.*` et `disk-storage.adapter.ts` existent")
constat("liste des variables EXIGÉES en production (`PROD_REQUIRED_EXPLICIT`)",
        cherche(r'^\s*"(CLIENT_URL|PRO_URL|AUTH_COOKIE_SECURE|GOOGLE_CLIENT_ID|PAYMENTS_ENABLED|CORS_ORIGINS|DATABASE_URL)",?\s*$', ["apps/api/src/config/env.ts"]),
        "voir (CORS_ORIGINS y figure-t-il ?)", "—")
constat("défaut de `CORS_ORIGINS`", cherche(r"CORS_ORIGINS|localhost:3000,", ["apps/api/src/config/env.ts"]), "voir", "—")
pk = [f for f in suivis if f.endswith("package.json") and "node_modules" not in f]
constat("dépendance `pg-boss` (file de tâches, expiration)", [f for f in pk if '"pg-boss"' in lire(f)], "PRÉSENTE", "ABSENTE de tous les package.json")
constat("écriture du statut `EXPIRED` d'une réservation (code API hors tests)",
        cherche(r"status:\s*(BookingStatus\.EXPIRED|\"EXPIRED\")|BookingCommand\.EXPIRE", [f for f in CODE if f.startswith("apps/api/src/")]),
        "PRÉSENTE", "ABSENTE")
constat("Dockerfile, CI ou fichier d'hébergement suivis",
        [f for f in suivis if re.search(r"(?i)dockerfile|^\.github/|gitlab-ci|\.circleci|fly\.toml|render\.yaml|vercel\.json|netlify\.toml", f)],
        "PRÉSENTS", "AUCUN")
constat("route HTTP qui appelle `PaymentsService`", cherche(r"PaymentsService", [f for f in CODE if f.endswith(".controller.ts")]),
        "PRÉSENTE", "AUCUNE — le service n'est exposé par aucun contrôleur")

print("\n== SEO")
constat("`robots` ou `sitemap` sous `apps/client/src/app/`", [f for f in suivis if f.startswith("apps/client/src/app/")
                                                            and re.search(r"(^|/)(robots|sitemap)\.(ts|tsx|txt|xml)$", f)], "PRÉSENTS", "ABSENTS")
constat("`alternates.languages` (hreflang) dans les métadonnées", cherche(r"languages\s*:", ["apps/client/src/lib/seo.ts"]), "PRÉSENT", "ABSENT")
constat("`NEXT_PUBLIC_SITE_URL` : repli et garde de production", cherche(r"NEXT_PUBLIC_SITE_URL|throw", ["apps/client/src/lib/seo.ts"]),
        "voir (un `throw` voisin dirait une garde)", "—")
constat("données structurées schema.org (`ld+json`)", cherche(r"ld\+json", [f for f in CODE if f.startswith("apps/client/")]), "PRÉSENTES", "ABSENTES")

print("\n== CONFORMITÉ")
for p in ("cgu", "confidentialite"):
    constat(f"page `{p}` : contenu « Bientôt disponible »", cherche(r"comingSoon|قريباً", [f"apps/client/src/app/[locale]/{p}/page.tsx"]),
            "PLACEHOLDER", "contenu réel")
rf = "apps/client/src/components/auth/register-form.tsx"
constat("inscription : case d'acceptation et ce qui part vers l'API", cherche(r"(?i)accept|terms|cgu|register\(", [rf]), "voir", "—")
constat("anonymisation d'un compte : écritures sur `bookings`", cherche(r"booking", ["apps/api/src/account/account-deletion.service.ts"]),
        "PRÉSENTES", "AUCUNE — les instantanés de contact restent")

print("\n== ARABE")
fr, ar = json.loads(lire("packages/i18n/messages/fr.json")), json.loads(lire("packages/i18n/messages/ar.json"))


def feuilles(o, p=""):
    if isinstance(o, dict):
        for k, v in o.items():
            yield from feuilles(v, f"{p}.{k}" if p else k)
    else:
        yield p


kf, ka = set(feuilles(fr)), set(feuilles(ar))
print(f"\n[{n + 1}] clés i18n : FR {len(kf)} · AR {len(ka)} · symétriques {kf == ka}")
aut = {f: lire(f) for f in ("AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md")}
plat = {f: re.sub(r"\s+", " ", t) for f, t in aut.items()}
faites = [f"{f}" for f, t in plat.items() for _ in re.finditer(r"(clés|arabe)[^.]{0,60}\b(relues|relu|validées?)\s+par\s+(un|une|Ko|le)\b", t)]
ouvertes = [l for l in aut["ZWADJ_BACKLOG.md"].splitlines() if re.match(r"^\s*- \[ \]", l) and re.search(r"(?i)arabe", l)
            and re.search(r"(?i)relu|relecture|non relues|I18N", l)]
print(f"[{n + 2}] relecture humaine de l'arabe : phrases « … relues/validées par … » dans les trois fichiers d'autorité (texte aplati, "
      f"{sum(map(len, plat.values()))} car.) : {len(faites)} · entrées OUVERTES du backlog qui parlent de relire l'arabe (première ligne) : {len(ouvertes)}")
for l in ouvertes:
    print(f"     {l.strip()[:120]}")
