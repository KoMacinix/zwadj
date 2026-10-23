"""Rejoue les suites des ROUGES du lot D336 APRÈS le code, et écrit les pièces sous `docs/preuves/D336/verts/`.

COPIE de `docs/preuves/D336/rouges/jouer-rouges.py` (D291 : la procédure entre au dépôt avec ses journaux) : les MÊMES groupes, les MÊMES fichiers de test, les
MÊMES commandes et le même environnement ; seuls changent le dossier, l'en-tête des pièces, et les empreintes, qui se COMPARENT à celles des rouges, fichier par
fichier (un test modifié après les rouges se dit, il ne se tait pas).

Usage (depuis la racine) : python3 jouer-verts.py <groupe>…   — groupes : empreintes, api, client, pro, int
Chaque pièce : un en-tête (commande, HEAD, code de sortie, date) puis la sortie BRUTE de vitest (couleurs coupées), en UTF-8, écrite par Python — jamais
par une redirection de PowerShell (qui réencode en UTF-16).
"""
import datetime
import hashlib
import os
import shutil
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    print("ABANDON : à lancer depuis la racine du dépôt")
    sys.exit(2)
DOSSIER = "docs/preuves/D336/verts"
EMPREINTES_ROUGES = "docs/preuves/D336/rouges/empreintes-tests.txt"
os.makedirs(DOSSIER, exist_ok=True)

TESTS = {
    "api": ("@zwadj/api", "apps/api", [
        "src/clients/pro-client-policy.spec.ts",
        "src/clients/pro-clients.service.spec.ts",
        "src/common/client-record.spec.ts",
        "src/venues/quotes.service.spec.ts",
        "src/venues/quote-store.prisma.spec.ts",
        "src/documents/quote-document.spec.ts",
        "src/documents/quote-document.service.spec.ts",
    ], [], "vert-api-unitaire.txt"),
    "client": ("@zwadj/api-client", "packages/api-client", [
        "src/clients-client.test.ts",
        "src/quotes-client.test.ts",
    ], [], "vert-api-client.txt"),
    "pro": ("@zwadj/pro", "apps/pro", [
        "src/dashboard/walkin-journey.test.tsx",
        "src/dashboard/walkin-contact.test.ts",
        "src/dashboard/walkin-client.test.ts",
        "src/venues/quotes-section.test.tsx",
    ], [], "vert-pro.txt"),
    "int": ("@zwadj/api", "apps/api", [
        "test/int/pro-clients.int-spec.ts",
        "test/int/quotes.int-spec.ts",
        "test/int/quote-document.int-spec.ts",
        "test/int/migration-non-empty.int-spec.ts",
        "test/int/pdf-renderer.int-spec.ts",
    ], ["-c", "vitest.config.int.ts"], "vert-integration.txt"),
}
# Les fichiers de SUPPORT de test que les rouges ont chargés (doubles) : leur empreinte est relevée avec celle des tests.
SUPPORT = ["apps/pro/src/test-support/client-doubles.ts"]

head = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()


def sha(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def empreintes_rouges():
    rouges = {}
    for ligne in open(EMPREINTES_ROUGES, encoding="utf-8").read().split("\n"):
        if ligne and not ligne.startswith("#"):
            empreinte, chemin = ligne.split("  ", 1)
            rouges[chemin.split("  ")[0]] = empreinte
    return rouges


def empreintes():
    rouges = empreintes_rouges()
    lignes = [f"# D336 — empreintes SHA-256 des fichiers de test rejoués VERTS après le code (et de leur support), à l'octet — HEAD {head}",
              f"# relevées le {datetime.datetime.now().isoformat(timespec='seconds')} ; comparées, fichier par fichier, à {EMPREINTES_ROUGES}", ""]
    n, differents = 0, 0
    chemins = [f"{racine}/{f}" for _, (_, racine, fichiers, _, _) in TESTS.items() for f in fichiers] + SUPPORT
    for chemin in chemins:
        actuelle = sha(chemin)
        rouge = rouges.get(chemin)
        if rouge is None:
            etat = "ABSENT des rouges"
        elif rouge == actuelle:
            etat = "identique au rouge"
        else:
            etat = "DIFFÉRENT du rouge"
            differents += 1
        support = "  (support de test)" if chemin in SUPPORT else ""
        lignes.append(f"{actuelle}  {chemin}{support}  — {etat}")
        n += 1
    lignes.append("")
    lignes.append(f"# {n} fichiers examinés ; {len(rouges)} empreintes de rouges lues ; {differents} différent(s) du rouge (chacun est dit, avec son motif, dans la section D336)")
    open(f"{DOSSIER}/empreintes-tests.txt", "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
    print(f"empreintes : {n} fichiers, {len(rouges)} rouges lus, {differents} différent(s) → {DOSSIER}/empreintes-tests.txt")


def jouer(groupe):
    paquet, racine, fichiers, options, piece = TESTS[groupe]
    pnpm = shutil.which("pnpm")
    commande = [pnpm, "--filter", paquet, "exec", "vitest", "run", *options, *fichiers]
    env = dict(os.environ, NO_COLOR="1", FORCE_COLOR="0", CI="1", DEBUG_PRINT_LIMIT="200")
    debut = datetime.datetime.now()
    r = subprocess.run(commande, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    fin = datetime.datetime.now()
    entete = [
        f"# D336 — VERT « {groupe} » : la suite du rouge, rejouée APRÈS le code",
        f"# commande : pnpm --filter {paquet} exec vitest run {' '.join(options + fichiers)}",
        f"# HEAD : {head} (le code du lot est dans l'arbre de travail)",
        "# environnement : NO_COLOR=1 FORCE_COLOR=0 CI=1 DEBUG_PRINT_LIMIT=200",
        f"# début {debut.isoformat(timespec='seconds')} — fin {fin.isoformat(timespec='seconds')} — code de sortie {r.returncode}",
        "# ── sortie brute (stdout puis stderr) ──",
        "",
    ]
    contenu = "\n".join(entete) + r.stdout + ("\n# ── stderr ──\n" + r.stderr if r.stderr.strip() else "")
    open(f"{DOSSIER}/{piece}", "w", encoding="utf-8", newline="\n").write(contenu)
    print(f"{groupe} : code {r.returncode}, {len(r.stdout.splitlines())} lignes stdout, {len(r.stderr.splitlines())} lignes stderr → {DOSSIER}/{piece}")


for g in sys.argv[1:]:
    if g == "empreintes":
        empreintes()
    else:
        jouer(g)
