"""D350 — l'état des lieux d'ADM-2, RE-MESURÉ à b8e5511 (jamais recopié du cadrage de D320, qui date du 01/10/2026).

POURQUOI IL EXISTE. La consigne du rang 52 s'appuie sur des constats du relecteur faits PAR LECTURE (la garde de rôle du Pro, `PublicationBadge`, `loadPending`) et sur une absence (aucun écran
`/admin`). Une consigne qui s'appuie sur un existant se mesure (D231). Ce script LIT les sources ; il n'écrit rien.

MODE D'EMPLOI. Depuis la RACINE du dépôt : `python3 -I docs/preuves/D350/etat-des-lieux/releve.py`. Sortie : une ligne par question, « mesuré / attendu » côte à côte, et le nombre de fichiers
PARCOURUS à côté de chaque total (D290 : un 0 sur zéro fichier parcouru n'est pas une mesure).

CALIBRATION (rejouée à CHAQUE lancement, il ABANDONNE si un cas manque son verdict) : chaque compteur est d'abord appliqué à deux textes synthétiques — un qui contient exactement ce qu'il cherche
(attendu 1), un qui n'en contient rien (attendu 0). Un compteur qui répondrait « 1 » à tout, ou « 0 » à tout, ne passe pas.

INSTRUMENTS ÉCARTÉS : un `grep -c` ligne à ligne (aveugle à ce qui enjambe un retour à la ligne, et le dépôt est en CRLF — D275, D289) ; un comptage sur le texte brut de `git diff` (il compte aussi
les lignes retirées). Ici : les sources en OCTETS décodés UTF-8, CRLF ramené à LF EN MÉMOIRE, comptage sur le texte aplati quand le motif peut enjamber une ligne.
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

RACINE = Path.cwd()
if not (RACINE / "pnpm-workspace.yaml").exists():
    sys.exit("ABANDON : à lancer depuis la racine du dépôt (pnpm-workspace.yaml introuvable)")


def lire(chemin: Path) -> str:
    return chemin.read_bytes().decode("utf-8").replace("\r\n", "\n")


def sources(dossier: str, extensions: tuple[str, ...], hors_tests: bool = True) -> list[Path]:
    out: list[Path] = []
    for p in sorted((RACINE / dossier).rglob("*")):
        if not p.is_file() or "node_modules" in p.parts or "dist" in p.parts:
            continue
        if p.suffix not in extensions:
            continue
        if hors_tests and (p.name.endswith((".test.ts", ".test.tsx", ".spec.ts")) or "test-support" in p.parts or "test-setup" in p.name):
            continue
        out.append(p)
    return out


def compter(motif: str, fichiers: list[Path]) -> tuple[int, list[str]]:
    """Occurrences du motif (regex) dans l'ensemble des fichiers ; rend le total ET les fichiers touchés."""
    total = 0
    touches: list[str] = []
    rx = re.compile(motif)
    for f in fichiers:
        n = len(rx.findall(lire(f)))
        if n:
            total += n
            touches.append(f"{f.relative_to(RACINE).as_posix()}×{n}")
    return total, touches


# ── Calibration : deux bras par compteur ────────────────────────────────────
CAS = [
    ("rendu d'un badge", r"<PublicationBadge\b", "<div><PublicationBadge status={x} /></div>", "<div>PublicationBadge</div>"),
    ("balise robots", r"(?i)<meta\s+name=\"robots\"|noindex", '<meta name="robots" content="noindex" />', "<meta name=\"viewport\" />"),
    ("adresse /admin écrite", r"[\"'`]/admin\b", 'const p = "/admin/salles";', 'const p = "/administrateur";'),
    ("lecture du refus par le pro", r"\bgetPublicationReview\b|\brejectionReason\b", "client.getPublicationReview(id)", "client.getVenue(id)"),
    ("client admin construit", r"\bcreateAdminClient\b|\bcreateVenuePublicationClient\b", "createAdminClient(request)", "createAuthClient()"),
]
for nom, motif, positif, negatif in CAS:
    n_pos = len(re.findall(motif, positif))
    n_neg = len(re.findall(motif, negatif))
    if n_pos < 1 or n_neg != 0:
        sys.exit(f"ABANDON — calibration manquée pour « {nom} » : cas positif {n_pos} (attendu ≥ 1), cas négatif {n_neg} (attendu 0)")
print(f"calibration : {len(CAS)} compteurs, deux bras chacun, tous passés")

pro_src = sources("apps/pro/src", (".ts", ".tsx"))
pro_tout = sources("apps/pro/src", (".ts", ".tsx", ".css", ".html"), hors_tests=False)
print(f"fichiers parcourus : apps/pro/src hors tests = {len(pro_src)} ; apps/pro/src avec tests = {len(sources('apps/pro/src', ('.ts', '.tsx'), hors_tests=False))}")


def ligne(question: str, mesure: object, attendu: object, detail: str = "") -> None:
    marque = "✓" if mesure == attendu else "✗ ÉCART"
    print(f"{marque}  {question} : mesuré {mesure} (attendu {attendu}){(' — ' + detail) if detail else ''}")


# 1. La garde de rôle : que fait-elle d'un ADMIN aujourd'hui ?
rp = lire(RACINE / "apps/pro/src/auth/require-pro.tsx")
ligne("`user.role !== \"PRO\"` dans require-pro.tsx (un ADMIN y tombe sur la carte « mauvais rôle »)", len(re.findall(r'user\.role !== "PRO"', rp)), 1)
ligne("`<Navigate to=\"/\"` dans RedirectIfSession (tout rôle connecté part vers « / »)", len(re.findall(r'<Navigate to="/" replace />', rp)), 1)
ligne("garde ADMIN existante (`RequireAdmin`, `role === \"ADMIN\"`) dans apps/pro/src", compter(r"\bRequireAdmin\w*|role === [\"']ADMIN[\"']", pro_src)[0], 0)
lp = lire(RACINE / "apps/pro/src/auth/login-page.tsx")
ligne("la page de connexion envoie TOUJOURS vers « / » (`navigate(\"/\")`)", len(re.findall(r'navigate\("/"\)', lp)), 1)

# 2. Aucun écran admin, aucune adresse /admin, aucun client admin câblé dans l'app Pro.
n, f = compter(r"[\"'`]/admin\b", pro_src)
ligne("adresses `/admin` écrites dans apps/pro/src hors tests", n, 0, ", ".join(f))
n, f = compter(r"\bcreateAdminClient\b|\bcreateVenuePublicationClient\b", pro_src)
ligne("clients `createAdminClient` / `createVenuePublicationClient` utilisés par l'app Pro", n, 0, ", ".join(f))
n, f = compter(r"\bgetPublicationReview\b|\brejectionReason\b", pro_src)
ligne("le pro lit-il son refus ? (`getPublicationReview`, `rejectionReason` dans apps/pro/src hors tests)", n, 0, ", ".join(f))
ligne("dossier apps/pro/src/admin existant", (RACINE / "apps/pro/src/admin").exists(), False)

# 3. PublicationBadge : où est-il rendu ?
n, f = compter(r"<PublicationBadge\b", pro_src)
ligne("rendus de `<PublicationBadge`", n, 2, ", ".join(f))
ligne("le libellé « draft » du badge (clé `venue.ui.publication.draft`) lu pour un DRAFT, sans regarder un refus", len(re.findall(r"venue\.ui\.publication\.draft", lire(RACINE / "apps/pro/src/venues/venue-form.tsx"))), 1)

# 4. L'indexation : que fait déjà l'app Pro ?
n, f = compter(r"(?i)<meta\s+name=[\"']robots[\"']|noindex", pro_tout)
ligne("balise robots / `noindex` dans apps/pro/src", n, 0, ", ".join(f))
html = lire(RACINE / "apps/pro/index.html")
ligne("`<meta name=\"robots\"` dans apps/pro/index.html", len(re.findall(r'<meta\s+name="robots"', html)), 0)
ligne("apps/pro/public/robots.txt existant", (RACINE / "apps/pro/public/robots.txt").exists(), False)

# 5. La file des suppressions : où la décision de statut se lit-elle ?
svc = lire(RACINE / "apps/api/src/account/account-deletion.service.ts")
ligne("appels de `this.loadPending(` (la lecture du statut AVANT la transaction)", len(re.findall(r"this\.loadPending\(", svc)), 2)
ligne("check-and-set sur `status: \"PENDING\"` dans le service (l'annulation par l'utilisateur seule)", len(re.findall(r'status: "PENDING"', svc)), 1)
ligne("écritures de la demande PAR `id` seul, sans condition de statut (`accountDeletionRequest.update({ where: { id`)", len(re.findall(r"accountDeletionRequest\.update\(\{\s*where: \{ id", svc)), 2)

# 6. reject : la condition de statut du rejet d'une salle.
adm = lire(RACINE / "apps/api/src/venues/venues-admin.service.ts")
ligne("`rejectionReason: null` dans la condition du check-and-set de `reject` (un motif déjà posé ⇒ jamais écrit)", len(re.findall(r"publicationStatus: \{ in: \[\.\.\.REJECTABLE_FROM\] \}, rejectionReason: null", adm)), 1)
ligne("`VENUE_ALREADY_REJECTED` jeté par `reject` (le 409 provisoire de D349)", len(re.findall(r"VenueModerationErrorCode\.VENUE_ALREADY_REJECTED", adm)), 1)

# 7. Les clés i18n d'aujourd'hui pour l'état de publication du pro (FR et AR, parité).
import json

for lang in ("fr", "ar"):
    d = json.loads((RACINE / f"packages/i18n/messages/{lang}.json").read_bytes().decode("utf-8"))
    ligne(f"clé `venue.ui.publication.draft` dans {lang}.json", "draft" in d["venue"]["ui"]["publication"], True)
    ligne(f"bloc de premier niveau `publicationReview` déjà présent dans {lang}.json", "publicationReview" in d, False)
