#!/usr/bin/env python3
"""
D325 — `r25-lien-connexion` : LE LOT L'A-T-IL RALENTI ? Mesure AVANT / APRÈS, dans les mêmes conditions (pièce jetable, versée).

POURQUOI : à la 3ᵉ passe de l'e2e complète du rang 32, `fr — « Se connecter pour demander » mène à la page de connexion réelle` a dépassé son attente de 7 s (`toHaveURL`) ;
la pièce de D324 le relève à 6,9 s dans la suite, il durait 10,1 s et 11,3 s aux deux passes précédentes. « Avant/après se MESURENT, ils ne s'estiment pas » (CLAUDE.md).
Hypothèse À VÉRIFIER, pas à croire : la route `/fr/auth/connexion` du client est ABSENTE de `warmup.setup.ts` (D127 : « une route absente sera compilée par le premier test qui la
demande ») ; le lot ajouterait-il à ce coût ?

MÉTHODE : la spec seule (`--workers=1`, UNE pile neuve par mesure : la compilation à la demande se paie à chaque fois), N mesures sur l'arbre du LOT, puis N mesures sur les SOURCES
de `HEAD` (tous les fichiers SUIVIS modifiés hors documents, tests et références sont ramenés à `HEAD`), puis restauration, PROUVÉE par l'empreinte. Sauvegarde sur disque avant
toute réécriture, restaurée au démarrage suivant. Rend, par mesure, la durée du test `fr` et du test `ar`, lue sur la sortie `list` de Playwright.

Usage, depuis la RACINE : python3 docs/preuves/D325/e2e/comparer-lien-connexion.py [N]   (N = 3 par défaut)
"""
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

ANSI = re.compile(r"\x1b\[[0-9;]*m")
SAUVEGARDE = ".comparer-d325"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
N = int(sys.argv[1]) if len(sys.argv) > 1 else 3


def empreinte(c):
    return hashlib.sha256(open(c, "rb").read()).hexdigest()


def ecrire(c, o):
    with open(c, "wb") as f:
        f.write(o)


def restaurer(manifeste):
    for a in manifeste:
        ecrire(a["chemin"], open(os.path.join(SAUVEGARDE, a["sauvegarde"]), "rb").read())


def restaurer_si_interrompu():
    if os.path.isfile(MANIFESTE):
        restaurer(json.load(io.open(MANIFESTE, encoding="utf-8")))
        print("↺ arbre restauré après une exécution interrompue.")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def fichiers_a_ramener():
    sortie = subprocess.run(["git", "diff", "--name-only", "HEAD"], capture_output=True, text=True, encoding="utf-8").stdout.split()
    exclus = (".md", ".test.ts", ".test.tsx", ".spec.ts", ".int-spec.ts", "e2e/baselines/", "pnpm-lock.yaml")
    return [f for f in sortie if not any(e in f for e in exclus)]


def mesurer(etiquette):
    lignes = []
    for i in range(N):
        r = subprocess.run([shutil.which("pnpm") or "pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "specs/r25-lien-connexion.e2e.ts", "--workers=1", "--reporter=list"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        sortie = ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or "")).replace("\r", "")
        durees = {m.group(1): m.group(2) for m in re.finditer(r"^\s+(?:ok|x)\s+\d+\s+\[chromium\].*?› (fr|ar) — .*\(([\d.]+)s\)\s*$", sortie, re.M)}
        statuts = re.findall(r"^\s+(ok|x)\s+\d+\s+\[chromium\]", sortie, re.M)
        lignes.append((durees.get("fr"), durees.get("ar"), statuts, r.returncode))
        print(f"  {etiquette} · mesure {i + 1}/{N} : fr {durees.get('fr')} s · ar {durees.get('ar')} s · statuts {statuts} · code {r.returncode}")
    return lignes


def main():
    restaurer_si_interrompu()
    print(f"=== ARBRE DU LOT : {N} mesures (une pile neuve chacune)")
    lot = mesurer("lot ")
    fichiers = fichiers_a_ramener()
    os.makedirs(SAUVEGARDE, exist_ok=True)
    avant = {f: empreinte(f) for f in fichiers}
    manifeste = []
    for n, f in enumerate(fichiers):
        nom = f"{n:03d}.bin"
        ecrire(os.path.join(SAUVEGARDE, nom), open(f, "rb").read())
        manifeste.append({"chemin": f, "sauvegarde": nom})
    io.open(MANIFESTE, "w", encoding="utf-8").write(json.dumps(manifeste))
    print(f"\n=== SOURCES DE HEAD : {len(fichiers)} fichier(s) suivi(s) modifié(s) ramené(s) à HEAD (hors documents, tests, références)")
    try:
        for f in fichiers:
            blob = subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True)
            if blob.returncode != 0 or not blob.stdout:
                print(f"✗ `git show HEAD:{f}` a échoué ou rend vide : on s'arrête.")
                return 2
            ecrire(f, blob.stdout)
        tete = mesurer("HEAD")
    finally:
        restaurer(manifeste)
        shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    ecarts = [f for f in fichiers if empreinte(f) != avant[f]]
    print(f"\nrestauration : {len(fichiers) - len(ecarts)} fichier(s) identique(s) au départ sur {len(fichiers)} (attendu {len(fichiers)}) · {len(ecarts)} différent(s) (attendu 0)")
    for nom, lignes in (("LOT", lot), ("HEAD", tete)):
        fr = [float(x[0]) for x in lignes if x[0]]
        ar = [float(x[1]) for x in lignes if x[1]]
        print(f"{nom:5s} fr : {sorted(fr)} · ar : {sorted(ar)}")
    return 2 if ecarts else 0


if __name__ == "__main__":
    sys.exit(main())
