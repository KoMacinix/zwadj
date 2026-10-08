#!/usr/bin/env python3
"""
D326 — REJOUER LE CONSTAT « AVANT » CONTRE LES SOURCES DE `HEAD` (pièce versée, jamais promue en instrument).

POURQUOI : le constat d'origine (« 1. 01L'essentiel » dans un navigateur ; « Ma salle » sans la salle créée) a été pris AVANT le correctif, mais seules ses IMAGES ont été versées
(`captures/avant/`) — pas les lignes `MESURE …` que la sonde écrit (le type de liste réellement appliqué par le navigateur, le texte de chaque entrée, la présence de la salle). Une mesure
dont on ne peut relire que l'image n'est pas versée. Ce script ramène à leur contenu de `HEAD` les quatre sources que le lot a changées pour cet écran, rejoue la sonde, RESTAURE, et
PROUVE la restauration par l'empreinte. Ses images vont dans `captures/avant-rejoue/` : les images d'origine (`captures/avant/`) ne sont PAS écrasées.

Usage, depuis la RACINE : python3 docs/preuves/D326/navigateur/rejouer-avant.py
Sauvegarde sur DISQUE avant toute réécriture, restaurée au démarrage suivant. Ne lit rien d'autre que `git show HEAD:<chemin>`.
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
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

SAUVEGARDE = ".rejouer-avant-d326"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
SORTIE = os.path.join("docs", "preuves", "D326", "navigateur", "captures", "mesures-avant-rejoue.txt")
SOURCES = [
    "apps/pro/src/venues/venue-wizard.tsx",
    "apps/pro/src/venues/create-venue-page.tsx",
    "apps/pro/src/venues/edit-venue-page.tsx",
    "apps/pro/src/theme.css",
]
ANSI = re.compile(r"\x1b\[[0-9;]*m")


def empreinte(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def restaurer(manifeste):
    for a in manifeste:
        with open(os.path.join(SAUVEGARDE, a["sauvegarde"]), "rb") as f:
            octets = f.read()
        with open(a["chemin"], "wb") as f:
            f.write(octets)


def main():
    if os.path.isfile(MANIFESTE):
        restaurer(json.load(io.open(MANIFESTE, encoding="utf-8")))
        print("↺ arbre restauré après une exécution interrompue.")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    os.makedirs(SAUVEGARDE, exist_ok=True)
    depart = {s: empreinte(s) for s in SOURCES}
    manifeste = []
    for n, s in enumerate(SOURCES):
        with open(s, "rb") as f:
            octets = f.read()
        nom = f"{n:02d}.bin"
        with open(os.path.join(SAUVEGARDE, nom), "wb") as f:
            f.write(octets)
        manifeste.append({"chemin": s, "sauvegarde": nom})
    io.open(MANIFESTE, "w", encoding="utf-8").write(json.dumps(manifeste))
    try:
        for s in SOURCES:
            blob = subprocess.run(["git", "show", f"HEAD:{s}"], capture_output=True)
            if blob.returncode != 0 or not blob.stdout:
                print(f"✗ `git show HEAD:{s}` a échoué ou rend vide : on s'arrête, rien n'est mesuré.")
                return 2
            with open(s, "wb") as f:
                f.write(blob.stdout)
        differents = sum(empreinte(s) != depart[s] for s in SOURCES)
        print(f"sources ramenées à HEAD : {len(SOURCES)} · {differents} différente(s) de l'arbre (attendu {len(SOURCES)})")
        env = dict(os.environ, D326_ETAT="avant-rejoue")
        r = subprocess.run([shutil.which("pnpm") or "pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "--config",
                            "../docs/preuves/D326/navigateur/playwright.capture.config.ts", "assistant.capture.ts"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
        sortie = ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))
    finally:
        restaurer(manifeste)
        shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    apres = {s: empreinte(s) for s in SOURCES}
    ecarts = [s for s in SOURCES if apres[s] != depart[s]]
    print(f"restauration : {len(SOURCES) - len(ecarts)} fichier(s) identique(s) au départ sur {len(SOURCES)} (attendu {len(SOURCES)}) · {len(ecarts)} différent(s) (attendu 0)")
    lignes = [l for l in sortie.splitlines() if l.startswith("MESURE") or l.startswith("CAPTURE") or " passed" in l or " failed" in l]
    with open(SORTIE, "w", encoding="utf-8", newline="\n") as f:
        f.write(f"# Constat « avant » REJOUÉ contre les sources de HEAD ({', '.join(SOURCES)}) — code de sortie {r.returncode}\n" + "\n".join(lignes) + "\n")
    print(f"code {r.returncode} · {len(lignes)} ligne(s) retenue(s) → {SORTIE}")
    return 2 if ecarts else 0


if __name__ == "__main__":
    sys.exit(main())
