#!/usr/bin/env python3
"""Joue les fichiers de test du lot D354 contre l'état courant de l'arbre et verse, pour chaque famille : la commande, l'empreinte sha256 de CHAQUE fichier de test joué (octets de l'arbre de travail au moment du
jeu), le code de sortie, et la sortie BRUTE (sans codes ANSI). Usage : python3 jouer_rouges.py <dossier de sortie> <étiquette> [famille ...]   — familles : unit, client, int
Aucune interprétation ici : la LECTURE (assertion ou erreur ? combien de fichiers tombés à la collecte ?) se fait dans une note, sur la sortie brute (D275, D304)."""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import time

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

sortie, etiquette = sys.argv[1], sys.argv[2]
familles = sys.argv[3:] or ["unit", "client", "int"]
os.makedirs(sortie, exist_ok=True)
PNPM = shutil.which("pnpm") or "pnpm"
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")

UNIT = [
    "apps/api/src/common/staff-capabilities.spec.ts",
    "apps/api/src/common/staff-contract.spec.ts",
    "apps/api/src/staff/staff-account-state.spec.ts",
    "apps/api/src/staff/staff-access-policy.spec.ts",
    "apps/api/src/staff/staff-members-policy.spec.ts",
    "apps/api/src/staff/staff-temporary-password.spec.ts",
    "apps/api/src/staff/staff-members.service.spec.ts",
    "apps/api/src/staff/staff-session.guard.spec.ts",
    "apps/api/src/staff/staff-session.service.spec.ts",
    "apps/api/src/staff/staff-store.prisma.spec.ts",
    "apps/api/src/staff/staff-source-guards.spec.ts",
]
CLIENT = ["packages/api-client/src/staff-client.test.ts"]
INT = [
    "apps/api/test/int/staff-members.int-spec.ts",
    "apps/api/test/int/staff-last-manager.int-spec.ts",
    "apps/api/test/int/staff-capabilities.int-spec.ts",
    "apps/api/test/int/staff-password-expiry.int-spec.ts",
    "apps/api/test/int/log-temporary-password.int-spec.ts",
    "apps/api/test/int/staff-session-guard.int-spec.ts",
]
PLAN = {
    "unit": (UNIT, ["--filter", "@zwadj/api", "exec", "vitest", "run"], lambda f: f.replace("apps/api/", "")),
    "client": (CLIENT, ["--filter", "@zwadj/api-client", "exec", "vitest", "run"], lambda f: f.replace("packages/api-client/", "")),
    "int": (INT, ["--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts"], lambda f: f.replace("apps/api/", "")),
}
env = dict(os.environ, FORCE_COLOR="0", NO_COLOR="1")
for nom in familles:
    fichiers, base, rel = PLAN[nom]
    manquants = [f for f in fichiers if not os.path.isfile(f)]
    if manquants:
        print(f"✗ fichiers de test introuvables : {manquants}")
        sys.exit(2)
    empreintes = {f: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in fichiers}
    cmd = [PNPM, *base, *[rel(f) for f in fichiers]]
    debut = time.time()
    r = subprocess.run(cmd, capture_output=True, env=env, encoding="utf-8", errors="replace")
    duree = time.time() - debut
    brut = ANSI.sub("", r.stdout + ("\n--- stderr ---\n" + r.stderr if r.stderr.strip() else ""))
    chemin = os.path.join(sortie, f"{etiquette}-{nom}.txt")
    entete = [f"# D354 — {etiquette} — famille « {nom} »", f"# commande : {' '.join(cmd)}", f"# code de sortie : {r.returncode} ; durée : {duree:.0f} s", "# empreintes sha256 des fichiers de test joués (octets de l'arbre de travail) :"]
    entete += [f"#   {h}  {f}" for f, h in sorted(empreintes.items())]
    entete.append("# ---- sortie brute, sans codes ANSI ----")
    open(chemin, "w", encoding="utf-8", newline="").write("\n".join(entete) + "\n" + brut.replace("\r\n", "\n"))
    resume = [l for l in brut.split("\n") if re.match(r"\s*(Test Files|Tests)\s", l)]
    print(f"{nom}: code {r.returncode} en {duree:.0f} s → {chemin}")
    for l in resume:
        print("   ", l.strip())
