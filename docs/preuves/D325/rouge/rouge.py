#!/usr/bin/env python3
"""
D325 — LE ROUGE, LU : les tests NEUFS du rang 32, rejoués contre le COMPOSANT D'AVANT (pièce versée, jamais promue en instrument).

POURQUOI : CLAUDE.md — « un défaut se reproduit par une mesure avant d'être corrigé » ; AGENTS.md — « un défaut se prouve par un test rouge AVANT tout correctif ».
Dans ce lot les tests ont été écrits avec les correctifs ; le rouge se relève donc APRÈS COUP : pour chaque fichier de test, on ramène à son contenu de `HEAD` la ou
les SOURCES qu'il exerce (jamais un test, jamais un message i18n, jamais un document), on rejoue le test, on restaure, et la restauration est PROUVÉE par l'empreinte.

⚠ GRANULARITÉ — DÉFAUT DE LA PREMIÈRE PASSE, GARDÉ COMME PIÈCE (`passe-1-tout-ensemble/`, D298). La première version ramenait les 16 sources à `HEAD` D'UN COUP : huit fichiers
de tests rendaient « no tests » — leurs IMPORTATIONS (`PHONE_COUNTRIES`, `DEFAULT_PHONE_COUNTRY`…, le modèle de pays, additif) n'existent pas à `HEAD`, le fichier ne se charge
même pas : ce n'est PAS une reproduction de défaut, c'est un défaut de l'instrument. Cette version ne ramène que la source EXERCÉE, et conserve les contrats additifs
(`packages/types` : modèle de pays, `contact.ts` ; `packages/ui` : `index.ts`, `phone-field.tsx`) : le test se charge, et s'il rougit, c'est sur le COMPORTEMENT d'avant.

CE QU'IL NE MESURE PAS, DIT D'AVANCE : un test qui vise un module NEUF (`phone-field.tsx`, `walkin-contact.ts`, `contact.ts`, le modèle de pays de `phone.ts`) n'a pas de
« comportement d'avant » : `ui-phone-field.test.tsx` (pro et client), `walkin-contact.test.ts` et `phone.spec.ts` ne sont donc PAS rejoués ici — leurs gardes sont prouvées par
la NEUTRALISATION (`neutralisation/neutralize-r32.py`). Seul ce qui est lu comme `AssertionError` vaut « défaut reproduit » ; une requête qui ne trouve rien
(`TestingLibraryElementError`) ou un `Error` de matcher est classé « autre » et LU À LA MAIN dans la section de décision.

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

ACCOUNT_CL = "apps/client/src/components/account/account-settings-view.tsx"
REGISTER_CL = "apps/client/src/components/auth/register-form.tsx"
BOOKING_CL = "apps/client/src/components/venue/booking-request-panel.tsx"
VISIT_CL = "apps/client/src/components/venue/visit-booking-panel.tsx"
ACCOUNT_PRO = "apps/pro/src/account/account-settings-page.tsx"
REGISTER_PRO = "apps/pro/src/auth/register-page.tsx"
WALKIN = "apps/pro/src/dashboard/walkin-journey.tsx"
THEME = "apps/pro/src/theme.css"
EDIT = "apps/pro/src/venues/edit-venue-page.tsx"
BOOKING_T = "packages/types/src/booking.ts"
QUOTE_T = "packages/types/src/quote.ts"
RAIL = "packages/ui/src/journey.tsx"

# (nom, paquet, fichier de test, sources ramenées à HEAD pour CE test)
TESTS = [
    ("pro-walkin-journey", "@zwadj/pro", "src/dashboard/walkin-journey.test.tsx", [WALKIN, RAIL]),
    ("pro-edit-venue-save", "@zwadj/pro", "src/venues/edit-venue-save.test.tsx", [EDIT]),
    ("pro-calendar-style", "@zwadj/pro", "src/venues/calendar-style.test.ts", [THEME]),
    ("pro-account", "@zwadj/pro", "src/account/account-settings-page.test.tsx", [ACCOUNT_PRO]),
    ("pro-app-register", "@zwadj/pro", "src/App.test.tsx", [REGISTER_PRO]),
    ("client-account", "@zwadj/client", "src/components/account/account-settings-view.test.tsx", [ACCOUNT_CL]),
    ("client-register", "@zwadj/client", "src/components/auth/register-form.test.tsx", [REGISTER_CL]),
    ("client-booking", "@zwadj/client", "src/components/venue/booking-request-panel.test.tsx", [BOOKING_CL]),
    ("client-visit", "@zwadj/client", "src/components/venue/visit-booking-panel.test.tsx", [VISIT_CL]),
    ("client-filter-wizard-rail", "@zwadj/client", "src/components/filter-wizard.test.tsx", [RAIL]),
    ("api-contact-serveur", "@zwadj/api", "src/common/contact.spec.ts", [BOOKING_T, QUOTE_T]),
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
