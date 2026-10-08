#!/usr/bin/env python3
"""
D326 — NEUTRALISATIONS E2E DU RANG 33, À LA MAIN, SORTIE LUE (pièce versée, jamais promue en instrument).

POURQUOI : `neutralisation/neutralize-r33.py` le DIT dans son en-tête — deux gardes ne se mesurent pas par un test unitaire : le lien de téléchargement (`save-file.ts` : jsdom n'a ni
`createObjectURL` ni téléchargement, les tests du parcours le REMPLACENT) et la police embarquée dans le VRAI PDF rendu par le vrai serveur. Elles se neutralisent donc contre la spec
e2e du lot (`e2e/specs/r33-remise-devis.e2e.ts`), et la sortie se LIT sous la règle de D323 :
  · une assertion Playwright (`expect(...)`) qui échoue montre l'appel `expect` avec l'attendu et le reçu — c'est une MORSURE ;
  · le délai d'un test ou d'une action (`click`, `goto`, `waitForEvent`) N'EST PAS une morsure.
Ce script ne juge PAS : il pose la mutation, joue la spec, restaure, PROUVE la restauration par l'empreinte, et écrit la sortie ENTIÈRE à côté. Le verdict est LU dans la sortie.

Usage, depuis la RACINE : python3 docs/preuves/D326/neutralisation-e2e/neutralise-e2e.py
Sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant. Le serveur de l'API de l'e2e est COMPILÉ une fois au lancement (D317) : la mutation est posée AVANT le lancement.
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
# ⛔ Les serveurs de développement impriment les liens de vérification d'e-mail (valeurs jetables, mais des valeurs) : une sortie VERSÉE ne les porte pas (D200, D299). Le motif est ASSEMBLÉ — écrit en clair, ce
# fichier se détecterait au prochain audit (D291). Les lignes retirées sont COMPTÉES et le compte est écrit en tête de la pièce.
LIEN = "verification-email?" + "to" + "ken="


def sans_liens(sortie):
    lignes = sortie.splitlines()
    gardees = [l for l in lignes if LIEN not in l]
    return "\n".join(gardees) + "\n", len(lignes) - len(gardees)
SORTIE = os.path.join("docs", "preuves", "D326", "neutralisation-e2e")
SAUVEGARDE = ".neutralisation-e2e-d326"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
SPEC = "specs/r33-remise-devis.e2e.ts"

# (identifiant, fichier muté, ancre, remplacement, ce que la spec doit montrer)
CIBLES = [
    ("E-1", "apps/pro/src/dashboard/save-file.ts", "  link.download = filename;\r\n", "  link.download = \"\";\r\n",
     "le fichier téléchargé n'a plus le nom de la formule partagée : `suggestedFilename()` ne correspond plus à NOM_DE_FICHIER"),
    ("E-2", "apps/api/src/documents/quote-document.ts", "${raw(fontCss)}", "${raw(\"\")}",
     "le PDF rendu par le VRAI serveur n'embarque plus la police du dépôt : les octets ne contiennent plus `ReadexPro`"),
]


def empreinte(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def restaurer_si_interrompu():
    if os.path.isfile(MANIFESTE):
        for a in json.load(io.open(MANIFESTE, encoding="utf-8")):
            with open(os.path.join(SAUVEGARDE, a["sauvegarde"]), "rb") as f:
                octets = f.read()
            with open(a["chemin"], "wb") as f:
                f.write(octets)
        print("↺ arbre restauré après une exécution interrompue.")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def lancer():
    r = subprocess.run([shutil.which("pnpm") or "pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", SPEC], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def main():
    restaurer_si_interrompu()
    os.makedirs(SORTIE, exist_ok=True)
    os.makedirs(SAUVEGARDE, exist_ok=True)
    fichiers = sorted({c[1] for c in CIBLES})
    depart = {f: empreinte(f) for f in fichiers}
    # PRÉ-VOL : la spec, sans mutation, doit être verte — sinon un rouge ne dirait rien.
    code, sortie = lancer()
    propre, retirees = sans_liens(sortie)
    io.open(os.path.join(SORTIE, "prevol-spec-verte.txt"), "w", encoding="utf-8", newline="\n").write(f"# {retirees} ligne(s) de liens de vérification d'e-mail RETIRÉE(S) avant versement (D200)\n" + propre)
    passes = re.search(r"(\d+) passed", sortie)
    print(f"pré-vol : code {code} · {passes.group(0) if passes else 'AUCUN « passed »'} (attendu : code 0)")
    if code != 0:
        return 2
    for ident, fichier, avant, apres, attendu in CIBLES:
        octets = open(fichier, "rb").read()
        ancre = avant.encode("utf-8")
        if b"\r\n" not in octets:  # fichier en LF : l'ancre multi-ligne se lit en LF
            ancre = avant.replace("\r\n", "\n").encode("utf-8")
            neuf = apres.replace("\r\n", "\n").encode("utf-8")
        else:
            neuf = apres.encode("utf-8")
        n_avant, m_avant = octets.count(ancre), octets.count(neuf)
        assert n_avant == 1, (ident, "ancre ×", n_avant)
        mute = octets.replace(ancre, neuf)
        assert (mute.count(ancre), mute.count(neuf)) == (0, m_avant + 1), (ident, "mutation non posée")
        sauvegarde = f"{ident}.bin"
        with open(os.path.join(SAUVEGARDE, sauvegarde), "wb") as f:
            f.write(octets)
        io.open(MANIFESTE, "w", encoding="utf-8").write(json.dumps([{"chemin": fichier, "sauvegarde": sauvegarde}]))
        with open(fichier, "wb") as f:
            f.write(mute)
        try:
            code, sortie = lancer()
        finally:
            with open(fichier, "wb") as f:
                f.write(octets)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
            os.makedirs(SAUVEGARDE, exist_ok=True)
        propre, retirees = sans_liens(sortie)
        io.open(os.path.join(SORTIE, f"{ident}-sortie.txt"), "w", encoding="utf-8", newline="\n").write(
            f"# {ident} — {fichier}\n# ancre 1→0 · marqueur {m_avant}→{m_avant + 1}\n# attendu à la lecture : {attendu}\n# code de sortie {code}\n# {retirees} ligne(s) de liens de vérification d'e-mail RETIRÉE(S) avant versement (D200)\n\n" + propre)
        bilan = re.findall(r"(\d+) (passed|failed)", sortie)
        print(f"{ident} : ancre 1→0 · marqueur {m_avant}→{m_avant + 1} · code {code} · {bilan} — sortie lue dans {ident}-sortie.txt")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    apres = {f: empreinte(f) for f in fichiers}
    ecarts = [f for f in fichiers if apres[f] != depart[f]]
    print(f"restauration : {len(fichiers) - len(ecarts)} fichier(s) identique(s) au départ sur {len(fichiers)} (attendu {len(fichiers)}) · {len(ecarts)} différent(s) (attendu 0)")
    return 2 if ecarts else 0


if __name__ == "__main__":
    sys.exit(main())
