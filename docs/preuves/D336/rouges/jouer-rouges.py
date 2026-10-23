"""Joue les ROUGES du lot D336 contre l'état d'AVANT le code (D334, item 5) et écrit les pièces sous `docs/preuves/D336/rouges/`.

Usage (depuis la racine) : python3 jouer-rouges.py <groupe>…   — groupes : empreintes, api, client, pro, int
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
DOSSIER = "docs/preuves/D336/rouges"
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
    ], [], "rouge-api-unitaire.txt"),
    "client": ("@zwadj/api-client", "packages/api-client", [
        "src/clients-client.test.ts",
        "src/quotes-client.test.ts",
    ], [], "rouge-api-client.txt"),
    "pro": ("@zwadj/pro", "apps/pro", [
        "src/dashboard/walkin-journey.test.tsx",
        "src/dashboard/walkin-contact.test.ts",
        "src/dashboard/walkin-client.test.ts",
        "src/venues/quotes-section.test.tsx",
    ], [], "rouge-pro.txt"),
    "int": ("@zwadj/api", "apps/api", [
        "test/int/pro-clients.int-spec.ts",
        "test/int/quotes.int-spec.ts",
        "test/int/quote-document.int-spec.ts",
        "test/int/migration-non-empty.int-spec.ts",
        "test/int/pdf-renderer.int-spec.ts",
    ], ["-c", "vitest.config.int.ts"], "rouge-integration.txt"),
}
# Les fichiers de SUPPORT de test que les rouges ont chargés (doubles) : leur empreinte est relevée avec celle des tests.
SUPPORT = ["apps/pro/src/test-support/client-doubles.ts"]

head = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()


def sha(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def empreintes():
    lignes = [f"# D336 — empreintes SHA-256 des fichiers de test joués ROUGES (et de leur support), à l'octet — HEAD {head}", f"# relevées le {datetime.datetime.now().isoformat(timespec='seconds')}", ""]
    n = 0
    for _, (_, racine, fichiers, _, _) in TESTS.items():
        for f in fichiers:
            chemin = f"{racine}/{f}"
            lignes.append(f"{sha(chemin)}  {chemin}")
            n += 1
    for chemin in SUPPORT:
        lignes.append(f"{sha(chemin)}  {chemin}  (support de test)")
        n += 1
    lignes.append("")
    lignes.append(f"# {n} fichiers examinés")
    open(f"{DOSSIER}/empreintes-tests.txt", "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
    print(f"empreintes : {n} fichiers → {DOSSIER}/empreintes-tests.txt")


def jouer(groupe):
    paquet, racine, fichiers, options, piece = TESTS[groupe]
    pnpm = shutil.which("pnpm")
    commande = [pnpm, "--filter", paquet, "exec", "vitest", "run", *options, *fichiers]
    # DEBUG_PRINT_LIMIT : Testing Library imprime le DOM à chaque échec (7 000 caractères par défaut) ; 200 garde un indice sans noyer la pièce.
    env = dict(os.environ, NO_COLOR="1", FORCE_COLOR="0", CI="1", DEBUG_PRINT_LIMIT="200")
    debut = datetime.datetime.now()
    r = subprocess.run(commande, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    fin = datetime.datetime.now()
    entete = [
        f"# D336 — ROUGE « {groupe} » contre l'état d'AVANT le code (D334, item 5)",
        f"# commande : pnpm --filter {paquet} exec vitest run {' '.join(options + fichiers)}",
        f"# HEAD : {head} (aucun fichier de code du lot n'existe : seuls les tests et leur support sont modifiés)",
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
