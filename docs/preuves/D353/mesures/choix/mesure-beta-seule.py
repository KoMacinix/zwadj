#!/usr/bin/env python3
"""D353 — mesure : `β` SEULE (la relecture des listes vides, `api.ts` corrigé) avec l'e2e du DÉPART (`global-setup.ts` et `playwright.config.ts` de HEAD). `r48` jouée seule depuis F (cache absent)
puis depuis E (cache empoisonné, copie de référence). Les deux fichiers e2e sont REMIS à leur état d'arbre de travail (octets prouvés) quoi qu'il arrive. Pièce jetable (D291), depuis la RACINE.
Usage : python3 mesure-beta-seule.py <dossier E-ref> <dossier de sortie>"""
import hashlib
import os
import shutil
import subprocess
import sys

E_REF, SORTIE = sys.argv[1], sys.argv[2]
FICHIERS = ["e2e/global-setup.ts", "e2e/playwright.config.ts"]
CACHE = "apps/client/.next/cache/fetch-cache"
sauve = {f: open(f, "rb").read() for f in FICHIERS}
empreintes = {f: hashlib.sha256(b).hexdigest() for f, b in sauve.items()}
lignes = [f"{f} (arbre de travail, corrigé) · sha256 {h}" for f, h in empreintes.items()]


def head(f: str) -> bytes:
    return subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True).stdout.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")


def jouer(etat: str) -> None:
    shutil.rmtree(CACHE, ignore_errors=True)
    if etat == "E":
        shutil.copytree(E_REF, CACHE)
    r = subprocess.run("pnpm --filter @zwadj/e2e exec playwright test specs/r48-assistant-choix.e2e.ts", shell=True, capture_output=True, encoding="utf-8", errors="replace")
    brut = r.stdout + r.stderr
    open(os.path.join(SORTIE, f"beta-seule-depuis-{etat}-sortie.txt"), "w", encoding="utf-8", newline="\n").write(brut)
    import re
    propre = re.sub(r"\x1b\[[0-9;]*m", "", brut)
    res = [l.strip()[:150] for l in propre.splitlines() if re.match(r"^\s+(ok|x)\s+\d+ \[", l) or re.match(r"^\s+\d+ (passed|failed)", l)]
    lignes.append(f"β seule depuis {etat} : code de sortie {r.returncode} ; " + " | ".join(res))


try:
    for f in FICHIERS:
        open(f, "wb").write(head(f))
    lignes.append("e2e du DÉPART posé (global-setup.ts et playwright.config.ts de HEAD) ; api.ts reste corrigé (β)")
    jouer("F")
    jouer("E")
finally:
    for f, b in sauve.items():
        open(f, "wb").write(b)
ok = all(hashlib.sha256(open(f, "rb").read()).hexdigest() == h for f, h in empreintes.items())
lignes.append(f"restauration des deux fichiers e2e à l'octet : {ok}")
open(os.path.join(SORTIE, "beta-seule-bilan.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
print("\n".join(lignes))
sys.exit(0 if ok else 1)
