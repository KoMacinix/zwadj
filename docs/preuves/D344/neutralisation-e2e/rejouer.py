#!/usr/bin/env python3
"""
D344 — NEUTRALISATION À LA MAIN DES GARDES DES DEUX SPECS E2E REVENUES DANS LA SUITE (pièce versée, jamais promue en instrument — D291).

Patron : `docs/preuves/D325/neutralisation-e2e/rejouer.py`, dont ce script REPREND la machinerie (sauvegarde disque, mutation prouvée posée, restauration
prouvée par l'empreinte, extrait du bloc d'échec) et dont il change CE QUI SE JOUE : les specs sont désormais DANS la suite (`e2e/specs/`), donc elles se jouent
par la configuration de la suite (`e2e/playwright.config.ts`, avec son préchauffage), et non plus par la configuration du dossier des archives.

POURQUOI À LA MAIN : les gardes de ces specs ne se mesurent que dans un navigateur (cascade CSS, géométrie, ordre des événements, navigation : jsdom ne les
calcule pas). Aucun lecteur de sortie Playwright n'est codé dans un harnais (décision du relecteur, D323 : « les signatures se RELÈVENT et se calibrent à deux
bras avant d'être codées »). Les rouges se LISENT donc à la main, sous la règle D323 : une assertion web-first `expect(...)` qui expire EST une morsure si
l'échec lu montre l'appel `expect` avec l'attendu et le reçu ; le délai d'un test ou d'une action N'EST PAS une morsure. Ce script ne juge pas : l'extrait se LIT
(`lecture-des-rouges.md`).

CE QUE FAIT CE SCRIPT, rien de plus : pose UNE mutation (ancre 1 → 0 ET marqueur n → n + 1 pour une substitution ; ancre 1 → 1 ET marqueur n → n + 1 pour une
insertion — D286), lance UN test e2e par son titre, restaure, prouve la restauration par l'empreinte, et écrit un EXTRAIT de la sortie (le bloc d'échec, jamais le
journal brut : il porte des cookies et des liens à jeton, D200). `vert` joue les deux specs SANS mutation et écrit le vert de départ, filtré de la même façon.

Usage, depuis la RACINE : python3 docs/preuves/D344/neutralisation-e2e/rejouer.py <K-1|vert|tout>
Sauvegarde sur DISQUE avant mutation, restaurée au démarrage suivant (un `finally` ne survit pas à un signal).
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
SORTIE = os.path.join("docs", "preuves", "D344", "neutralisation-e2e")
SAUVEGARDE = ".neutralisation-d344-e2e"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
R30 = "r30-lien-calendrier-pro"
R32 = "r32-nouvelle-reservation"

THEME = "apps/pro/src/theme.css"
CHAMP = "packages/ui/src/phone-field.tsx"
WK = "apps/pro/src/dashboard/walkin-journey.tsx"
EDIT = "apps/pro/src/venues/edit-venue-page.tsx"

CIBLES = {
    "K-1": {"libelle": "le lien « Calendrier de la salle » revient à la route SUPPRIMÉE `/salles/<id>/calendrier` (le défaut d'origine de D322)", "fichier": EDIT, "spec": R30,
            "avant": '<Link to={CALENDAR_PATH} className="btn" onClick={() => selectVenue(venue.id)}>',
            "apres": '<Link to={`/salles/${venue.id}/calendrier`} className="btn" onClick={() => selectVenue(venue.id)}>',
            "test": "le lien « Calendrier de la salle » de l'assistant mène au calendrier"},
}


def lire(chemin):
    return io.open(chemin, encoding="utf-8", newline="").read()


def ecrire(chemin, texte):
    io.open(chemin, "w", encoding="utf-8", newline="").write(texte)


def empreinte(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def restaurer_si_interrompu():
    if os.path.isfile(MANIFESTE):
        for a in reversed(json.load(io.open(MANIFESTE, encoding="utf-8"))):
            ecrire(a["chemin"], a["contenu"])
        print("↺ arbre restauré après une exécution interrompue.")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def commande(specs, titre=None):
    c = [shutil.which("pnpm") or "pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", *specs, "--reporter=list"]
    if titre:
        c += ["-g", re.escape(titre)]
    return c


def lignes_de(r):
    return [ANSI.sub("", l.rstrip("\r")) for l in ((r.stdout or "") + "\n" + (r.stderr or "")).split("\n")]


def extraire(lignes):
    """Les lignes de serveur sont ÉCARTÉES (elles portent des jetons de vérification : D200) ; le reste est gardé tel quel entre le premier bloc d'échec et le bilan."""
    serveur = sum(1 for l in lignes if l.startswith("[WebServer]"))
    gardees, dans = [], False
    for l in lignes:
        if l.startswith("[WebServer]"):
            continue
        if re.match(r"^\s+\d+\)\s+\[", l):
            dans = True
        elif re.match(r"^\s+(ok|x|-)\s+\d+\s+\[", l) or re.match(r"^\s+\d+\s+(passed|failed|flaky|skipped)", l):
            gardees.append(l)
            dans = False
            continue
        if dans and not l.strip().startswith(("attachment #", "test-results", "Usage:", "pnpm exec", "─")):
            gardees.append(l)
    return serveur, gardees


def jouer(ident):
    c = CIBLES[ident]
    source = lire(c["fichier"])
    avant_n, marque_n = source.count(c["avant"]), source.count(c["apres"])
    if avant_n != 1:
        print(f"✗ {ident} : ERREUR DE SCRIPT, {avant_n} occurrence(s) de l'ancre (1 attendue) dans {c['fichier']}")
        return 2
    mute = source.replace(c["avant"], c["apres"])
    # D286 — chaque genre a SON arithmétique : substitution ancre 1→0, insertion (le remplacement CONTIENT l'ancre) ancre 1→1 ; le marqueur passe de n à n+1 dans les deux.
    ancre_attendue = 1 if c.get("genre") == "insertion" else 0
    if (mute.count(c["avant"]), mute.count(c["apres"])) != (ancre_attendue, marque_n + 1):
        print(f"✗ {ident} : MUTATION NON POSÉE (ancre 1→{mute.count(c['avant'])}, marqueur {marque_n}→{mute.count(c['apres'])}, attendu 1→{ancre_attendue} et {marque_n}→{marque_n + 1})")
        return 2
    depart = empreinte(c["fichier"])
    os.makedirs(SAUVEGARDE, exist_ok=True)
    io.open(MANIFESTE, "w", encoding="utf-8").write(json.dumps([{"chemin": c["fichier"], "contenu": source}], ensure_ascii=False))
    ecrire(c["fichier"], mute)
    try:
        r = subprocess.run(commande([c["spec"]], c["test"]), capture_output=True, text=True, encoding="utf-8", errors="replace")
    finally:
        ecrire(c["fichier"], source)
        shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    restaure = empreinte(c["fichier"]) == depart
    lignes = lignes_de(r)
    serveur, gardees = extraire(lignes)
    entete = [f"# {ident} — {c['libelle']}",
              f"# fichier : {c['fichier']} · spec : e2e/specs/{c['spec']}.e2e.ts · ancre 1→{ancre_attendue} · marqueur {marque_n}→{marque_n + 1} · genre {c.get('genre', 'substitution')} · test joué : « {c['test']} »",
              f"# restauration prouvée par l'empreinte : {'OUI' if restaure else 'NON — ARBRE NON RESTAURÉ'} · code de sortie e2e : {r.returncode}",
              f"# {len(lignes)} lignes examinées, dont {serveur} lignes de serveur écartées (attendu > 0), {len(gardees)} gardées — extrait COPIÉ tel quel, ANSI retirés", ""]
    chemin = os.path.join(SORTIE, f"{ident}.txt")
    io.open(chemin, "w", encoding="utf-8", newline="\n").write("\n".join(entete + gardees) + "\n")
    print(f"■ {ident} · {c['libelle']}\n   ancre 1→{ancre_attendue} · marqueur {marque_n}→{marque_n + 1} · code e2e {r.returncode} · restauration {'OUI' if restaure else 'NON'} · extrait : {chemin}")
    if serveur == 0:
        print("   ⚠ ZÉRO ligne de serveur écartée : ou le journal n'en porte pas, ou l'extracteur ne les voit pas — non conclu.")
        return 2
    return 0 if restaure else 2


def vert():
    r = subprocess.run(commande([R30, R32]), capture_output=True, text=True, encoding="utf-8", errors="replace")
    lignes = lignes_de(r)
    serveur = sum(1 for l in lignes if l.startswith("[WebServer]"))
    gardees = [l for l in lignes if not l.startswith("[WebServer]") and not l.strip().startswith(("attachment #", "test-results"))]
    entete = ["# DÉPART SANS MUTATION — les deux specs, jouées par la configuration de la suite (préchauffage compris) ; le résultat est à LIRE (vert ou rouge), le titre ne le dit pas",
              f"# code de sortie e2e : {r.returncode} · {len(lignes)} lignes examinées, dont {serveur} lignes de serveur écartées (attendu > 0), {len(gardees)} gardées — ANSI retirés", ""]
    chemin = os.path.join(SORTIE, "vert-avant-mutation.txt")
    io.open(chemin, "w", encoding="utf-8", newline="\n").write("\n".join(entete + gardees) + "\n")
    print(f"■ vert · code e2e {r.returncode} · extrait : {chemin}")
    return 0 if (r.returncode == 0 and serveur > 0) else 2


def main():
    restaurer_si_interrompu()
    os.makedirs(SORTIE, exist_ok=True)
    arg = sys.argv[1:]
    if arg == ["vert"]:
        return vert()
    demandes = list(CIBLES) if arg == ["tout"] else arg
    if not demandes or any(d not in CIBLES for d in demandes):
        print(__doc__)
        return 2
    return max(jouer(d) for d in demandes)


if __name__ == "__main__":
    sys.exit(main())
