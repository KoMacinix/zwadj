#!/usr/bin/env python3
"""
D326 — LE ROUGE, LU : les tests NEUFS du rang 33, rejoués contre la SOURCE D'AVANT (pièce versée, jamais promue en instrument).

POURQUOI : CLAUDE.md — « un défaut se reproduit par une mesure avant d'être corrigé » ; AGENTS.md — « un défaut se prouve par un test rouge AVANT tout correctif ».
Dans ce lot les correctifs et leurs tests ont été écrits ensemble ; le rouge se relève donc APRÈS COUP, comme à D325 : pour chaque fichier de test, on ramène à son contenu de
`HEAD` la ou les SOURCES qu'il exerce (jamais un test, jamais un message i18n, jamais un document), on rejoue le test, on restaure, et la restauration est PROUVÉE par l'empreinte.
(Deux rouges ont été relevés AVANT le correctif, à la main, et sont versés à côté : `ma-salle-avant-correctif.txt`, `pro-360-avant-correctif.txt`.)

Outil DÉRIVÉ de `docs/preuves/D325/rouge/rouge.py` — même granularité (une source exercée à la fois, jamais les seize d'un coup : D298 a montré que « no tests » n'est pas une
reproduction), même classement (`AssertionError` = défaut reproduit ; « autre » = requête Testing Library, matcher jest-dom, TypeError, import : lu À LA MAIN).

CE QU'IL NE MESURE PAS, DIT D'AVANCE : un test qui vise un module NEUF (`remittance.ts`, `remittance-hook.ts`, `html.ts`, `quote-document*.ts`, `playwright-pdf.renderer.ts`,
`money.ts`) n'a pas de « comportement d'avant » : ses gardes sont prouvées par la NEUTRALISATION (`neutralisation/neutralize-r33.py`). Les spécifications d'intégration
(`quote-document.int-spec.ts`, `pdf-renderer.int-spec.ts`) visent des modules neufs aussi.

Usage, depuis la RACINE : python3 docs/preuves/D326/rouge/rouge.py
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

ANSI = re.compile(r"\x1b\[[0-9;]*m")
SORTIE = os.path.join("docs", "preuves", "D326", "rouge")
SAUVEGARDE = ".rouge-d326"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")

WALKIN = "apps/pro/src/dashboard/walkin-journey.tsx"
ASSISTANT = "apps/pro/src/venues/venue-wizard.tsx"
THEME = "apps/pro/src/theme.css"
CLIENT_DEVIS = "packages/api-client/src/quotes-client.ts"
CLIENT_AUTH = "packages/api-client/src/auth-client.ts"

# (nom, paquet, fichier de test, sources ramenées à HEAD pour CE test)
TESTS = [
    ("pro-walkin-journey", "@zwadj/pro", "src/dashboard/walkin-journey.test.tsx", [WALKIN]),
    ("pro-venue-wizard", "@zwadj/pro", "src/venues/venue-wizard.test.tsx", [ASSISTANT, THEME]),
    ("pro-layout-style", "@zwadj/pro", "src/venues/layout-style.test.ts", [THEME]),
    ("api-client-quotes", "@zwadj/api-client", "src/quotes-client.test.ts", [CLIENT_DEVIS]),
    ("api-client-auth-blob", "@zwadj/api-client", "src/auth-client.test.ts", [CLIENT_AUTH]),
]
SOURCES = sorted({s for _, _, _, srcs in TESTS for s in srcs})


def empreinte(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def ecrire_octets(chemin, octets):
    with open(chemin, "wb") as f:
        f.write(octets)


def restaurer_depuis_sauvegarde(manifeste):
    for a in manifeste:
        with open(os.path.join(SAUVEGARDE, a["sauvegarde"]), "rb") as f:
            ecrire_octets(a["chemin"], f.read())


def restaurer_si_interrompu():
    if os.path.isfile(MANIFESTE):
        restaurer_depuis_sauvegarde(json.load(io.open(MANIFESTE, encoding="utf-8")))
        print("↺ arbre restauré après une exécution interrompue.")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def echecs_de(sortie):
    lignes = sortie.splitlines()
    rendus, i = [], 0
    while i < len(lignes):
        if lignes[i].strip().startswith("FAIL ") and ">" in lignes[i]:
            titres = []
            while i < len(lignes) and (lignes[i].strip().startswith("FAIL ") or not lignes[i].strip()):
                if lignes[i].strip():
                    titres.append(lignes[i].strip())
                i += 1
            message = lignes[i].strip() if i < len(lignes) else "—"
            rendus += [(t, message) for t in titres]
        else:
            i += 1
    return rendus


def main():
    restaurer_si_interrompu()
    os.makedirs(SORTIE, exist_ok=True)
    os.makedirs(SAUVEGARDE, exist_ok=True)
    avant = {s: empreinte(s) for s in SOURCES}
    manifeste = []
    for n, s in enumerate(SOURCES):
        with open(s, "rb") as f:
            octets = f.read()
        nom = f"{n:02d}.bin"
        ecrire_octets(os.path.join(SAUVEGARDE, nom), octets)
        manifeste.append({"chemin": s, "sauvegarde": nom})
    io.open(MANIFESTE, "w", encoding="utf-8").write(json.dumps(manifeste))
    print(f"sources sauvegardées : {len(SOURCES)} (attendu {len(SOURCES)}) · tests à rejouer : {len(TESTS)}")
    resultats = []
    try:
        for nom, paquet, fichier, sources in TESTS:
            for s in sources:
                blob = subprocess.run(["git", "show", f"HEAD:{s}"], capture_output=True)
                if blob.returncode != 0 or not blob.stdout:
                    print(f"✗ `git show HEAD:{s}` a échoué ou rend vide : on s'arrête, rien n'est mesuré.")
                    return 2
                ecrire_octets(s, blob.stdout)
            differents = sum(empreinte(s) != avant[s] for s in sources)
            r = subprocess.run([shutil.which("pnpm") or "pnpm", "--filter", paquet, "exec", "vitest", "run", fichier], capture_output=True, text=True, encoding="utf-8", errors="replace")
            # Restauration IMMÉDIATE des sources de CE test : le suivant ne doit voir que ses propres sources d'avant.
            restaurer_depuis_sauvegarde([a for a in manifeste if a["chemin"] in sources])
            sortie = ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))
            ligne = re.search(r"^\s*Tests\s+(.*)$", sortie, re.M)
            echecs = echecs_de(sortie)
            lignes_tests = ligne.group(1).strip() if ligne else "AUCUNE LIGNE « Tests »"
            resultats.append((nom, paquet, fichier, sources, differents, r.returncode, lignes_tests, echecs))
            print(f"■ {nom} · {len(sources)} source(s) de HEAD ({differents} différente(s) de l'arbre) · code {r.returncode} · {lignes_tests} · {len(echecs)} échec(s) lu(s)")
    finally:
        restaurer_depuis_sauvegarde(manifeste)
        shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    apres = {s: empreinte(s) for s in SOURCES}
    ecarts = [s for s in SOURCES if apres[s] != avant[s]]
    print(f"restauration : {len(SOURCES) - len(ecarts)} fichier(s) identique(s) au départ sur {len(SOURCES)} (attendu {len(SOURCES)}) · {len(ecarts)} différent(s) (attendu 0)")
    for nom, paquet, fichier, sources, differents, code, ligne, echecs in resultats:
        classes = {"AssertionError": 0, "autre": 0}
        corps = []
        for titre, message in echecs:
            genre = "AssertionError" if message.startswith("AssertionError") else "autre"
            classes[genre] += 1
            corps.append(f"[{genre}] {titre}\n      ↳ {message[:220]}")
        entete = [f"# ROUGE LU — {nom} : {paquet} · {fichier}",
                  "# sources ramenées à `HEAD` pour ce test : " + ", ".join(sources) + f" ({differents} différente(s) de l'arbre) ; tests, i18n, contrats et modules neufs conservés",
                  f"# code de sortie {code} · ligne « Tests » : {ligne}",
                  f"# échecs lus : {len(echecs)} (AssertionError : {classes['AssertionError']} · autre : {classes['autre']}) — « autre » = TypeError, requête Testing Library, matcher jest-dom, "
                  "import : PAS une assertion native", ""]
        with open(os.path.join(SORTIE, f"{nom}.txt"), "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(entete + corps) + "\n")
    return 2 if ecarts else 0


if __name__ == "__main__":
    sys.exit(main())
