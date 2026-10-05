#!/usr/bin/env python3
"""
D325 — LE ROUGE, LU : les tests NEUFS du rang 32, rejoués contre les SOURCES DE `HEAD` (pièce versée, jamais promue en instrument).

POURQUOI : CLAUDE.md — « un défaut se reproduit par une mesure avant d'être corrigé » ; AGENTS.md — « un défaut se prouve par un test rouge AVANT tout correctif ».
Dans ce lot les tests ont été écrits avec les correctifs ; le rouge se relève donc APRÈS COUP, en rendant au code l'état qu'il avait avant le lot : chaque fichier
SOURCE modifié (jamais un test, jamais un message i18n — additifs, jamais un document) est ramené à son contenu de `HEAD`, les tests neufs sont rejoués, puis tout est
restauré et la restauration PROUVÉE par l'empreinte.

CE QU'IL NE MESURE PAS, DIT D'AVANCE : un test qui vise un module NEUF (`phone-field.tsx`, `walkin-contact.ts`, `contact.ts`) ne peut pas rougir « sur le défaut » —
le module n'existe pas à `HEAD`, il rougit par une erreur d'import ou un `TypeError` : ce n'est PAS une assertion, et la sortie le dit. Ces gardes-là sont prouvées par la
NEUTRALISATION (`neutralisation/neutralize-r32.py`), pas par ce script. Seul ce qui est lu comme `AssertionError` (ou une attente qui n'aboutit jamais, signalée comme telle)
vaut « défaut reproduit ».

Usage, depuis la RACINE : python3 docs/preuves/D325/rouge/rouge.py
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
SORTIE = os.path.join("docs", "preuves", "D325", "rouge")
SAUVEGARDE = ".rouge-d325"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")

SOURCES = [
    "apps/client/src/components/account/account-settings-view.tsx",
    "apps/client/src/components/auth/register-form.tsx",
    "apps/client/src/components/venue/booking-request-panel.tsx",
    "apps/client/src/components/venue/visit-booking-panel.tsx",
    "apps/pro/src/account/account-settings-page.tsx",
    "apps/pro/src/auth/register-page.tsx",
    "apps/pro/src/dashboard/walkin-journey.tsx",
    "apps/pro/src/theme.css",
    "apps/pro/src/venues/edit-venue-page.tsx",
    "packages/types/src/booking.ts",
    "packages/types/src/index.ts",
    "packages/types/src/phone.ts",
    "packages/types/src/quote.ts",
    "packages/ui/src/index.ts",
    "packages/ui/src/journey.tsx",
    "packages/ui/styles.css",
]
TESTS = [
    ("pro-walkin-journey", "@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
    ("pro-edit-venue-save", "@zwadj/pro", "src/venues/edit-venue-save.test.tsx"),
    ("pro-calendar-style", "@zwadj/pro", "src/venues/calendar-style.test.ts"),
    ("pro-account", "@zwadj/pro", "src/account/account-settings-page.test.tsx"),
    ("pro-app-register", "@zwadj/pro", "src/App.test.tsx"),
    ("client-account", "@zwadj/client", "src/components/account/account-settings-view.test.tsx"),
    ("client-register", "@zwadj/client", "src/components/auth/register-form.test.tsx"),
    ("client-booking", "@zwadj/client", "src/components/venue/booking-request-panel.test.tsx"),
    ("client-visit", "@zwadj/client", "src/components/venue/visit-booking-panel.test.tsx"),
    ("client-filter-wizard-rail", "@zwadj/client", "src/components/filter-wizard.test.tsx"),
    ("api-contact-serveur", "@zwadj/api", "src/common/contact.spec.ts"),
    ("api-phone", "@zwadj/api", "src/common/phone.spec.ts"),
]


def empreinte(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def restaurer_si_interrompu():
    if os.path.isfile(MANIFESTE):
        for a in json.load(io.open(MANIFESTE, encoding="utf-8")):
            with open(os.path.join(SAUVEGARDE, a["sauvegarde"]), "rb") as f:
                contenu = f.read()
            with open(a["chemin"], "wb") as f:
                f.write(contenu)
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
        with open(os.path.join(SAUVEGARDE, nom), "wb") as f:
            f.write(octets)
        manifeste.append({"chemin": s, "sauvegarde": nom})
    io.open(MANIFESTE, "w", encoding="utf-8").write(json.dumps(manifeste))
    print(f"sources sauvegardées : {len(SOURCES)} (attendu {len(SOURCES)}) · tests à rejouer : {len(TESTS)}")
    resultats = []
    try:
        for s in SOURCES:
            blob = subprocess.run(["git", "show", f"HEAD:{s}"], capture_output=True)
            if blob.returncode != 0 or not blob.stdout:
                print(f"✗ `git show HEAD:{s}` a échoué ou rend vide : on s'arrête, rien n'est mesuré.")
                return 2
            with open(s, "wb") as f:
                f.write(blob.stdout)
        print("sources ramenées à HEAD : " + str(sum(empreinte(s) != avant[s] for s in SOURCES)) + f" fichier(s) différent(s) du départ sur {len(SOURCES)}")
        for nom, paquet, fichier in TESTS:
            r = subprocess.run([shutil.which("pnpm") or "pnpm", "--filter", paquet, "exec", "vitest", "run", fichier], capture_output=True, text=True, encoding="utf-8", errors="replace")
            sortie = ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))
            ligne = re.search(r"^\s*Tests\s+(.*)$", sortie, re.M)
            echecs = echecs_de(sortie)
            resultats.append((nom, paquet, fichier, r.returncode, ligne.group(1).strip() if ligne else "AUCUNE LIGNE « Tests »", echecs, sortie))
            print(f"■ {nom} · code {r.returncode} · {ligne.group(1).strip() if ligne else 'AUCUNE LIGNE « Tests »'} · {len(echecs)} échec(s) lu(s)")
    finally:
        for a in manifeste:
            with open(os.path.join(SAUVEGARDE, a["sauvegarde"]), "rb") as f:
                contenu = f.read()
            with open(a["chemin"], "wb") as f:
                f.write(contenu)
        shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    apres = {s: empreinte(s) for s in SOURCES}
    ecarts = [s for s in SOURCES if apres[s] != avant[s]]
    print(f"restauration : {len(SOURCES) - len(ecarts)} fichier(s) identique(s) au départ sur {len(SOURCES)} (attendu {len(SOURCES)}) · {len(ecarts)} différent(s) (attendu 0)")
    for nom, paquet, fichier, code, ligne, echecs, sortie in resultats:
        classes = {"AssertionError": 0, "autre": 0}
        corps = []
        for titre, message in echecs:
            genre = "AssertionError" if message.startswith("AssertionError") else "autre"
            classes[genre] += 1
            corps.append(f"[{genre}] {titre}\n      ↳ {message[:220]}")
        entete = [f"# ROUGE LU — {nom} : {paquet} · {fichier}", "# sources de HEAD (16 fichiers), tests NEUFS du lot, i18n et modules neufs conservés",
                  f"# code de sortie {code} · ligne « Tests » : {ligne}",
                  f"# échecs lus : {len(echecs)} (AssertionError : {classes['AssertionError']} · autre : {classes['autre']}) — « autre » = TypeError, import, attente non aboutie : PAS une assertion", ""]
        with open(os.path.join(SORTIE, f"{nom}.txt"), "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(entete + corps) + "\n")
    return 2 if ecarts else 0


if __name__ == "__main__":
    sys.exit(main())
