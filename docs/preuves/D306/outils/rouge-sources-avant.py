# D306 — point 1 de la consigne : le ROUGE de 23a, rejoué INDÉPENDAMMENT de D305.
# Pose les TROIS sources de code de 23a telles qu'à `6e87430` (parent du commit de 23a,
# vérifié), GARDE les tests de `HEAD`, lance les deux mesures, puis RESTAURE.
#
# Preuves exigées et imprimées :
#   - parent : `git rev-parse <HEAD>^` = 6e87430… ;
#   - posé   : pour chaque fichier, `git hash-object` du fichier sur disque = blob de 6e87430 ;
#   - restauré : SHA-256 sur disque APRÈS = SHA-256 AVANT, et `git status --porcelain` vide.
# Refuse de démarrer sur un arbre sale. Un `finally` restaure même sur exception ; un
# processus TUÉ laisserait les trois fichiers posés et indexés : `git status` le montre, et
# `git checkout HEAD -- <fichiers>` rend l'état exact (HEAD est la sauvegarde).
# Usage, depuis la racine :  python docs/preuves/D306/outils/rouge-sources-avant.py
import hashlib
import os
import shutil
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

AVANT = "6e87430"
FICHIERS = [
    "apps/api/src/venues/booking-locks.prisma.ts",
    "apps/api/src/venues/booking-transitions.ts",
    "apps/api/src/venues/bookings.service.ts",
]
P = "docs/preuves/D306/rouge"
LANCER = "docs/preuves/D306/outils/lancer.py"


def git(*a: str) -> str:
    return subprocess.run(["git", *a], capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()


def sha(f: str) -> str:
    return hashlib.sha256(open(f, "rb").read()).hexdigest()


def main() -> int:
    if not os.path.exists("pnpm-workspace.yaml"):
        print("ABANDON : à lancer depuis la racine.")
        return 1
    if git("status", "--porcelain", "--", *FICHIERS, "apps/api/test", "apps/api/src"):
        print("ABANDON : arbre sale sur les sources ou les tests.")
        return 1
    head = git("rev-parse", "HEAD")
    parent = git("rev-parse", "HEAD^")
    avant = git("rev-parse", AVANT)
    print(f"HEAD={head}\nHEAD^={parent}\n{AVANT}={avant}\nPARENT_EST_AVANT={'OUI' if parent == avant else 'NON'}")
    if parent != avant:
        return 1
    avant_sha = {f: sha(f) for f in FICHIERS}
    os.makedirs(P, exist_ok=True)
    try:
        git("checkout", AVANT, "--", *FICHIERS)
        for f in FICHIERS:
            pose = git("hash-object", f)
            blob = git("rev-parse", f"{AVANT}:{f}")
            print(f"POSE {f} : hash-object={pose[:12]} blob@{AVANT}={blob[:12]} {'IDENTIQUE' if pose == blob else 'DIFFÉRENT'}")
            if pose != blob:
                return 1
        py = sys.executable
        subprocess.run([py, os.path.abspath(LANCER), os.path.abspath(f"{P}/int-reservations-sources-avant.txt"), "apps/api",
                        "--", "npx", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/bookings.int-spec.ts"], check=True)
        subprocess.run([py, os.path.abspath(LANCER), os.path.abspath(f"{P}/unit-transitions-sources-avant.txt"), "apps/api",
                        "--", "npx", "vitest", "run", "src/venues/booking-transitions.spec.ts"], check=True)
    finally:
        git("checkout", "HEAD", "--", *FICHIERS)
        ok = True
        for f in FICHIERS:
            apres = sha(f)
            same = apres == avant_sha[f]
            ok = ok and same
            print(f"RESTAURE {f} : sha256 avant={avant_sha[f][:16]} après={apres[:16]} {'IDENTIQUE' if same else 'DIFFÉRENT'}")
        st = git("status", "--porcelain", "--", *FICHIERS)
        print(f"GIT_STATUS_FICHIERS={'vide' if not st else st}")
        print(f"RESTAURATION={'PROUVÉE' if ok and not st else 'ÉCHEC'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
