#!/usr/bin/env python3
"""
D325 — NEUTRALISATION DES GARDES e2e DU RANG 32, À LA MAIN (pièce versée, jamais promue en instrument).

POURQUOI À LA MAIN : les gardes de `e2e/specs/r32-nouvelle-reservation.e2e.ts` ne se mesurent que dans un navigateur (cascade CSS, géométrie, ordre des
événements : jsdom ne les calcule pas). Aucun lecteur de sortie Playwright n'est codé dans un harnais (décision du relecteur, D323 : « les signatures se
RELÈVENT et se calibrent à deux bras avant d'être codées, dans un futur lot de code ») ; cette certification-ci les lit donc À LA MAIN, sous la règle D323 :
une assertion web-first `expect(...)` qui expire EST une morsure si l'échec lu montre l'appel `expect` avec l'attendu et le reçu ; le délai d'un test ou
d'une action N'EST PAS une morsure.

CE QUE FAIT CE SCRIPT, rien de plus : pose UNE mutation (ancre 1 → 0 ET marqueur n → n + 1, D286), lance UN test e2e par son titre, restaure, prouve la
restauration par l'empreinte, et écrit un EXTRAIT de la sortie (le bloc d'échec, jamais le journal brut : il porte des cookies et des liens à jeton, D200).
Il ne juge pas : l'extrait se LIT.

Usage, depuis la RACINE : python3 docs/preuves/D325/neutralisation-e2e/rejouer.py <E-n>   (ou `tout`)
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
SORTIE = os.path.join("docs", "preuves", "D325", "neutralisation-e2e")
SAUVEGARDE = ".neutralisation-r32-e2e"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
# ⚠ La spec n'est PAS dans la suite (`e2e/specs/`) : elle en est sortie sur le précédent de D322/D323 (classe D265, extension 10 de la table de D325). Elle se joue par la
# configuration du dossier `docs/preuves/D325/navigateur/`, dont la pile est celle de la suite (mêmes ports, même base). Une PREMIÈRE passe de ce script, jouée avec la spec
# encore dans la suite, a posé les mêmes cinq mutations et lu les mêmes cinq échecs ; elle est REJOUÉE depuis le nouvel emplacement pour que script et extraits se correspondent.
CONFIG = "../docs/preuves/D325/navigateur/playwright.capture.config.ts"
SPEC = "r32-nouvelle-reservation"

THEME = "apps/pro/src/theme.css"
CHAMP = "packages/ui/src/phone-field.tsx"
WK = "apps/pro/src/dashboard/walkin-journey.tsx"

CIBLES = {
    "E-1": {"libelle": "l'espacement entre deux champs disparaît (`.wk-pair + .wk-pair`)", "fichier": THEME,
            "avant": "margin-block-start: 24px;", "apres": "margin-block-start: 0;", "test": "le parcours de bout en bout"},
    "E-2": {"libelle": "la boîte du téléphone n'est plus LTR : en arabe, le drapeau passe à droite des chiffres", "fichier": CHAMP,
            "avant": '<div className={rejected || invalid ? "input-affix phone-field is-invalid" : "input-affix phone-field"} dir="ltr">',
            "apres": '<div className={rejected || invalid ? "input-affix phone-field is-invalid" : "input-affix phone-field"}>', "test": "en ARABE, à 360 px"},
    "E-3": {"libelle": "la fenêtre de confirmation s'ouvre AVANT la réponse du serveur", "fichier": WK,
            "avant": "const converted = await quotes.convert(quote.id, {",
            "apres": 'setDone({ kind: "standby", date: eventDate as string, client: "" }); const converted = await quotes.convert(quote.id, {',
            "test": "le parcours de bout en bout", "genre": "insertion"},
    "E-4": {"libelle": "un jour BLOQUÉ de week-end reprend la teinte du week-end (le statut ne l'emporte plus)", "fichier": THEME,
            "avant": ".cal-cell.is-weekend .cal-day.is-blocked { background: var(--cal-blocked); }",
            "apres": ".cal-cell.is-weekend .cal-day.is-blocked { background: var(--cal-weekend); }", "test": "le calendrier du parcours (point 7)"},
    "E-5": {"libelle": "le jour bloqué n'est plus HACHURÉ", "fichier": THEME,
            "avant": "repeating-linear-gradient(135deg, transparent 0 5px, var(--cal-hatch) 5px 6px);",
            "apres": "none;", "test": "le calendrier du parcours (point 7)"},
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
        r = subprocess.run([shutil.which("pnpm") or "pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "--config", CONFIG, SPEC, "-g", re.escape(c["test"]), "--reporter=list"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
    finally:
        ecrire(c["fichier"], source)
        shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    restaure = empreinte(c["fichier"]) == depart
    lignes = [ANSI.sub("", l.rstrip("\r")) for l in ((r.stdout or "") + "\n" + (r.stderr or "")).split("\n")]
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
    entete = [f"# {ident} — {c['libelle']}", f"# fichier : {c['fichier']} · ancre 1→{ancre_attendue} · marqueur {marque_n}→{marque_n + 1} · genre {c.get('genre', 'substitution')} · test joué : « {c['test']} »",
              f"# restauration prouvée par l'empreinte : {'OUI' if restaure else 'NON — ARBRE NON RESTAURÉ'} · code de sortie e2e : {r.returncode}",
              f"# {len(lignes)} lignes examinées, dont {serveur} lignes de serveur écartées (attendu > 0), {len(gardees)} gardées — extrait COPIÉ tel quel, ANSI retirés", ""]
    ecrire_extrait = os.path.join(SORTIE, f"{ident}.txt")
    io.open(ecrire_extrait, "w", encoding="utf-8", newline="\n").write("\n".join(entete + gardees) + "\n")
    print(f"■ {ident} · {c['libelle']}\n   ancre 1→{ancre_attendue} · marqueur {marque_n}→{marque_n + 1} · code e2e {r.returncode} · restauration {'OUI' if restaure else 'NON'} · extrait : {ecrire_extrait}")
    if serveur == 0:
        print("   ⚠ ZÉRO ligne de serveur écartée : ou le journal n'en porte pas, ou l'extracteur ne les voit pas — non conclu.")
        return 2
    return 0 if restaure else 2


def main():
    restaurer_si_interrompu()
    os.makedirs(SORTIE, exist_ok=True)
    demandes = list(CIBLES) if sys.argv[1:] == ["tout"] else sys.argv[1:]
    if not demandes or any(d not in CIBLES for d in demandes):
        print(__doc__)
        return 2
    return max(jouer(d) for d in demandes)


if __name__ == "__main__":
    sys.exit(main())
