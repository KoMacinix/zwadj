#!/usr/bin/env python3
"""Joue les fichiers de test du lot D355 contre l'état courant de l'arbre et verse, pour chaque famille : la commande, l'empreinte sha256 de CHAQUE fichier de test joué (octets de l'arbre de travail au moment du
jeu), le code de sortie, et la sortie BRUTE (sans codes ANSI). Usage : python3 jouer-rouges.py <dossier de sortie> <étiquette> [famille ...]   — familles : unit, int
Aucune interprétation ici : la LECTURE (assertion ou erreur ? combien de fichiers tombés à la collecte ?) se fait dans une note, sur la sortie brute (D275, D304).
Adapté de `docs/preuves/D354/rouges/jouer-rouges.py` (pièce : jamais promue en instrument, D291) : seules les LISTES de fichiers et l'étiquette du lot changent."""
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
familles = sys.argv[3:] or ["unit", "int"]
os.makedirs(sortie, exist_ok=True)
PNPM = shutil.which("pnpm") or "pnpm"
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")

UNIT = [
    "apps/api/src/staff/staff-session.service.spec.ts",
    "apps/api/src/staff/staff-store.prisma.spec.ts",
    "apps/api/src/clients/client-record-audit.spec.ts",
    "apps/api/src/clients/client-record-writes.spec.ts",
    "apps/api/src/clients/pro-clients.service.spec.ts",
    "apps/api/src/venues/quote-store.prisma.spec.ts",
    "apps/api/src/venues/quotes.service.spec.ts",
]
INT = [
    "apps/api/test/int/staff-login-race.int-spec.ts",
    "apps/api/test/int/client-record-audit.int-spec.ts",
]
# Les aides d'intégration jouées avec les tests (leur empreinte est rapportée, elles ne sont pas des fichiers de test passés à vitest)
AIDES_INT = [
    "apps/api/test/int/staff-helpers.ts",
    "apps/api/test/int/row-lock.ts",
    "apps/api/test/int/helpers.ts",
]
PLAN = {
    "unit": (UNIT, ["--filter", "@zwadj/api", "exec", "vitest", "run"], lambda f: f.replace("apps/api/", ""), []),
    "int": (INT, ["--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts"], lambda f: f.replace("apps/api/", ""), AIDES_INT),
}
env = dict(os.environ, FORCE_COLOR="0", NO_COLOR="1")
for nom in familles:
    fichiers, base, rel, aides = PLAN[nom]
    manquants = [f for f in fichiers + aides if not os.path.isfile(f)]
    if manquants:
        print(f"✗ fichiers de test introuvables : {manquants}")
        sys.exit(2)
    empreintes = {f: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in fichiers + aides}
    cmd = [PNPM, *base, *[rel(f) for f in fichiers]]
    debut = time.time()
    r = subprocess.run(cmd, capture_output=True, env=env, encoding="utf-8", errors="replace")
    duree = time.time() - debut
    brut = ANSI.sub("", r.stdout + ("\n--- stderr ---\n" + r.stderr if r.stderr.strip() else ""))
    chemin = os.path.join(sortie, f"{etiquette}-{nom}.txt")
    entete = [
        f"# D355 — {etiquette} — famille « {nom} »",
        f"# commande : {' '.join(cmd)}",
        f"# code de sortie : {r.returncode} ; durée : {duree:.0f} s",
        "# empreintes sha256 des fichiers de test joués et de leurs aides (octets de l'arbre de travail au moment du jeu)",
    ]
    entete += [f"#   {h}  {f}" for f, h in sorted(empreintes.items())]
    entete.append("# ---- sortie brute, sans codes ANSI ----")
    open(chemin, "w", encoding="utf-8", newline="").write("\n".join(entete) + "\n" + brut.replace("\r\n", "\n"))
    resume = [l for l in brut.split("\n") if re.match(r"\s*(Test Files|Tests)\s", l)]
    print(f"{nom}: code {r.returncode} en {duree:.0f} s → {chemin}")
    for l in resume:
        print("   ", l.strip())
