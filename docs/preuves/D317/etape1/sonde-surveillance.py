"""D317, rang 26, ÉTAPE 1 — QU'EST-CE QUI FAIT RECOMPILER L'API DE L'E2E ? Pièce versée (procédure archivée comme preuve,
D291 — pas un instrument promu). N'écrit RIEN de suivi par git : ses bras touchent seulement `apps/api/src/generated/`
(ignoré), et son journal va dans `.neutralisation-journaux/d317/` (ignoré).

POURQUOI. D316 a vu l'API de l'e2e recompiler d'elle-même (« File change detected » : 23:20:58 au démarrage du
global-setup, 00:14:35/37/39 dans un beforeAll), sans cause identifiée. Hypothèse du relecteur, NON ÉTABLIE : le serveur tourne
en surveillance et réagit à des fichiers ÉCRITS pendant les tests. Ce poste a la mise à jour NTFS du DERNIER ACCÈS activée
(`fsutil behavior query disablelastaccess` = 0) : une LECTURE peut aussi produire une notification. Il faut séparer les deux.

COMMENT. Le serveur de l'e2e est `nest start --watch` (CLI Nest 11.0.23, constructeur `tsc`, `tsconfig.build.json`). Un
OBSERVATEUR lancé ici est le même compilateur (TypeScript du dépôt) sur la même configuration, en surveillance, avec
`--extendedDiagnostics` : il imprime, pour chaque événement, le CHEMIN qui l'a déclenché (« Triggered with … »), ce que le
journal de Nest ne dit pas. ⚠ `--noEmit --incremental false` : l'observateur n'écrit rien (ni sortie, ni tsbuildinfo).
Puis des BRAS, chacun borné dans le journal par sa position d'octet avant et après :
  T      témoin : rien pendant 15 s                                   → attendu 0 (bras NÉGATIF de la calibration)
  L1     lecture d'un fichier du programme lu au démarrage             → à mesurer
  A      recul du DERNIER ACCÈS de ce fichier (os.utime, mtime gardé)  → à mesurer (écriture de MÉTADONNÉE)
  L2     lecture du même fichier, dernier accès désormais ancien       → à mesurer (le mécanisme « lecture »)
  W      création puis suppression d'un .ts sous src/generated/        → attendu ≥ 1 (bras POSITIF : une écriture)
  S1     `prisma db seed` (ce que fait `seedReferentials()`)          → à mesurer
  S2     `prisma migrate deploy` (ce que fait le global-setup)        → à mesurer
  A*     recul du dernier accès de TOUT src/generated/                → à mesurer (préparation de S1*)
  S1*    `prisma db seed` sur un client généré au dernier accès ancien → à mesurer
CALIBRATION À DEUX BRAS (D286) : T doit rendre 0 et W au moins 1, sinon l'observateur ne sépare rien ⇒ ABANDON.
Chaque bras imprime ce qu'il a parcouru (octets du journal lus) et l'attendu à côté du mesuré (D290).

Usage, depuis la racine :  python docs/preuves/D317/etape1/sonde-surveillance.py
"""
import os
import re
import subprocess
import sys
import time

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)
RACINE = os.getcwd()
API = os.path.join(RACINE, "apps", "api")
GEN = os.path.join(API, "src", "generated")
JOURNAL = os.path.join(RACINE, ".neutralisation-journaux", "d317", "observateur-tsc.log")
os.makedirs(os.path.dirname(JOURNAL), exist_ok=True)
DB = "postgresql://zwadj:zwadj@localhost:5432/zwadj_e2e?schema=public"  # la base DÉDIÉE de l'e2e (playwright.config.ts)
CIBLE = os.path.join(GEN, "prisma", "client.ts")
SONDE = os.path.join(GEN, "zz-sonde-d317.ts")
if not os.path.isfile(CIBLE):
    print(f"✗ {CIBLE} introuvable : le client Prisma n'est pas généré.")
    sys.exit(2)
tsc = subprocess.run(["node", "-p", "require.resolve('typescript/bin/tsc')"], cwd=API, capture_output=True, text=True).stdout.strip()
version = subprocess.run(["node", tsc, "--version"], cwd=API, capture_output=True, text=True).stdout.strip()
print(f"observateur : {version} · {os.path.relpath(tsc, RACINE)} · -p tsconfig.build.json --watch --noEmit --incremental false "
      "--extendedDiagnostics --preserveWatchOutput")

journal = open(JOURNAL, "wb")
obs = subprocess.Popen(["node", tsc, "-p", "tsconfig.build.json", "--watch", "--noEmit", "--incremental", "false",
                        "--extendedDiagnostics", "--preserveWatchOutput"], cwd=API, stdout=journal, stderr=subprocess.STDOUT)


def texte(debut: int = 0, fin: int | None = None) -> str:
    o = open(JOURNAL, "rb").read()
    return o[debut:fin].decode("utf-8", errors="replace")


def position() -> int:
    return os.path.getsize(JOURNAL)


t0 = time.time()
while "Watching for file changes" not in texte():
    if time.time() - t0 > 240 or obs.poll() is not None:
        print("✗ ABANDON : l'observateur n'a pas atteint « Watching for file changes »")
        obs.kill()
        sys.exit(2)
    time.sleep(1)
print(f"observateur prêt en {time.time() - t0:.0f} s · journal {position()} octets")
time.sleep(5)


def pnpm(*args: str) -> int:
    env = {**os.environ, "DATABASE_URL": DB}
    r = subprocess.run(["pnpm", "--filter", "@zwadj/api", "run", *args], cwd=RACINE, env=env, capture_output=True,
                       shell=sys.platform == "win32")
    return r.returncode


def lire(chemin: str) -> None:
    with open(chemin, "rb") as fh:
        fh.read()


def reculer(chemin: str) -> None:
    st = os.stat(chemin)
    os.utime(chemin, (time.time() - 7200, st.st_mtime))


def ecrire_puis_effacer() -> None:
    with open(SONDE, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("export const sondeD317 = 1;\n")
    time.sleep(6)
    os.remove(SONDE)


def reculer_tout() -> int:
    n = 0
    for d, _, fs in os.walk(GEN):
        for f in fs:
            reculer(os.path.join(d, f))
            n += 1
    return n


resultats = []


def bras(nom: str, action, attendu: str, repos: float = 8.0) -> None:
    debut = position()
    t = time.time()
    retour = action()
    time.sleep(repos)
    fin = position()
    w = texte(debut, fin)
    recompil = len(re.findall(r"File change detected", w))
    declencheurs = sorted({os.path.relpath(m.strip(), RACINE).replace("\\", "/") if os.path.isabs(m.strip()) else m.strip()
                           for m in re.findall(r"Triggered with (.+?) :: ", w)})
    resultats.append((nom, recompil))
    print(f"[{nom}] {time.time() - t:5.1f} s · journal lu {fin - debut} octets · recompilations {recompil} (attendu {attendu})"
          + (f" · retour {retour}" if retour is not None else ""))
    for p in declencheurs[:12]:
        print(f"      déclencheur : {p}")
    if len(declencheurs) > 12:
        print(f"      … {len(declencheurs) - 12} autre(s) déclencheur(s)")


bras("T  témoin, 15 s sans rien", lambda: time.sleep(15), "0")
bras("L1 lecture de src/generated/prisma/client.ts (lu au démarrage)", lambda: lire(CIBLE), "à mesurer")
bras("A  recul du dernier accès de ce fichier (mtime gardé)", lambda: reculer(CIBLE), "à mesurer")
bras("L2 lecture du même fichier, dernier accès ancien", lambda: lire(CIBLE), "à mesurer")
bras("W  création puis suppression de src/generated/zz-sonde-d317.ts", ecrire_puis_effacer, "≥ 1")
bras("S1 prisma db seed (seedReferentials)", lambda: pnpm("db:seed"), "à mesurer", repos=10)
bras("S2 prisma migrate deploy (global-setup)", lambda: pnpm("prisma:migrate"), "à mesurer", repos=10)
bras("A* recul du dernier accès de tout src/generated/", reculer_tout, "à mesurer", repos=12)
bras("S1* prisma db seed, client généré au dernier accès ancien", lambda: pnpm("db:seed"), "à mesurer", repos=10)

obs.terminate()
try:
    obs.wait(timeout=20)
except subprocess.TimeoutExpired:
    obs.kill()
journal.close()
if os.path.exists(SONDE):
    os.remove(SONDE)
r = dict(resultats)
print(f"journal de l'observateur : {os.path.relpath(JOURNAL, RACINE)} · {os.path.getsize(JOURNAL)} octets")
cal = (r["T  témoin, 15 s sans rien"] == 0, r["W  création puis suppression de src/generated/zz-sonde-d317.ts"] >= 1)
print(f"calibration : bras négatif T = 0 {'OK' if cal[0] else 'MANQUÉ'} · bras positif W ≥ 1 {'OK' if cal[1] else 'MANQUÉ'}")
sys.exit(0 if all(cal) else 2)
