#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 45 (SUITE) (D343) : D265, la garde `e2e/specs/d265-socket-perimee.e2e.ts`.

Ce que le lot ajoute : la correction de D265 dans `e2e/fixtures/harness.ts` (les deux fonctions qui appellent le `fetch` global ne réutilisent plus aucune connexion :
`connection: close`) et sa garde, `e2e/specs/d265-socket-perimee.e2e.ts` — qui REPRODUIT la condition (trois appels du vrai fixture, un blocage synchrone plus long que la
fermeture serveur, mesurée) et exige que l'appel suivant réussisse. Chaque cible ci-dessous retire la correction à UN endroit (l'appel commun, sa valeur, ou l'une des deux fonctions qui le contourne) ; la garde doit rougir, PAR `ECONNRESET`.

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r45.py          # aucune cible jouée : toutes sont e2e ⇒ NON MESURÉES, sortie 3
    python3 neutralisation/neutralize-r45.py --e2e    # les cibles, chacune sous sa mutation (serveurs de dev, zwadj_e2e)
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, Playwright non attendu, calibration manquée ou arbre non
conforme ; 3 = campagne INCOMPLÈTE (cibles hors exécution).

⛔ CHEMIN DE L'ARGENT — CE HARNAIS N'EN MUTE RIEN : il mute le harnais de test (`e2e/fixtures/`), qui ne calcule, n'arrondit et ne valide aucun montant.
⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316, D323). Pour chaque cible, une LISTE DE TITRES attendus (chacun exigé) ; pour chaque titre :
une ligne « x » du projet `chromium` le porte, elle ne finit pas en « (0ms) » (un crochet en échec : le corps n'a pas tourné), le BLOC d'erreur de ce test porte `expect(` — une assertion,
pas un plantage — ET porte `ECONNRESET` : la garde a mordu PAR LA CAUSE NOMMÉE. Un délai dépassé, un serveur absent, un autre message ne sont PAS une morsure (D323).
⚠ Les blocs se découpent sur leurs en-têtes « N) [chromium] › … », jamais par une expression gloutonne qui traverserait deux blocs quand deux tests échouent.
⛔ PLAYWRIGHT 1.50.1 : la lecture est calibrée sur SA sortie (rapporteur `list`) ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 (quatre SUBSTITUTIONS ; aucun remplacement n'est une sous-chaîne de son ancre, D325).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant par le manifeste.

POURQUOI IL EXISTE : une spec e2e verte qui ne mord pas donne une assurance sans mesure (CLAUDE.md). Cette garde est DÉTERMINISTE (elle reproduit la condition au lieu de l'attendre) :
elle ne peut donc pas « passer par hasard » sans la correction — c'est ce que les quatre cibles montrent.
"""

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
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-r45"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r45")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
PLAYWRIGHT_ATTENDU = "Version 1.50.1"

HARNAIS = "e2e/fixtures/harness.ts"
SPEC = "specs/d265-socket-perimee.e2e.ts"
T_POSTJSON = "D265 — createVerifiedAccount (postJson) : le premier appel après un blocage plus long que la fermeture serveur réussit"
T_APICALL = "D265 — apiCall : le premier appel après un blocage plus long que la fermeture serveur réussit"
CAUSE = "ECONNRESET"

MESURES = {"e2e-garde": ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", SPEC]}
MODE = {"e2e-garde": "e2e"}

CIBLES = [
    {"libelle": "R45-1. L'appel commun rouvre le pool : `connection: close` est retiré de SES en-têtes — `postJson` ET `apiCall` reprennent des connexions mortes",
     "fichier": HARNAIS, "avant": "headers: { ...init.headers, ...SANS_REUTILISATION },", "apres": "headers: { ...init.headers },",
     "mesure": "e2e-garde", "titres": [T_POSTJSON, T_APICALL]},
    {"libelle": "R45-2. La correction change de VALEUR : `connection: keep-alive` au lieu de `close` — les deux fonctions rouvrent le pool",
     "fichier": HARNAIS, "avant": 'const SANS_REUTILISATION = { connection: "close" } as const;',
     "apres": 'const SANS_REUTILISATION = { connection: "keep-alive" } as const;',
     "mesure": "e2e-garde", "titres": [T_POSTJSON, T_APICALL]},
    {"libelle": "R45-3. `apiCall` CONTOURNE l'appel commun et rappelle le `fetch` global : seule `apiCall` rouvre le pool",
     "fichier": HARNAIS, "avant": "const res = await appelHttp(", "apres": "const res = await fetch(",
     "mesure": "e2e-garde", "titres": [T_APICALL]},
    {"libelle": "R45-4. `postJson` CONTOURNE l'appel commun et rappelle le `fetch` global : seule `postJson` rouvre le pool",
     "fichier": HARNAIS, "avant": 'return appelHttp(url, { method: "POST"', "apres": 'return fetch(url, { method: "POST"',
     "mesure": "e2e-garde", "titres": [T_POSTJSON]},
]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[mesure]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or "")).replace("\r\n", "\n")


def blocs_echec(sortie: str) -> dict[str, str]:
    """En-tête « N) [chromium] › … » → texte de SON bloc, jusqu'à l'en-tête suivant ou au bilan."""
    blocs, courant, texte = {}, None, []
    for l in sortie.splitlines():
        if re.match(r"^\s+\d+\) \[chromium\] › ", l):
            if courant is not None:
                blocs[courant] = "\n".join(texte)
            courant, texte = l.strip(), []
        elif courant is not None and re.match(r"^\s+\d+ (failed|passed|flaky|skipped|did not run)\b", l):
            blocs[courant] = "\n".join(texte)
            courant, texte = None, []
        elif courant is not None:
            texte.append(l)
    if courant is not None:
        blocs[courant] = "\n".join(texte)
    return blocs


def lire_playwright(sortie: str, titres: list[str] | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, AUTRE-CAUSE, NON-DÉMARRÉE."""
    lignes = sortie.splitlines()
    echecs = [l for l in lignes if re.match(r"^\s+x\s+\d+ \[chromium\]", l)]
    oks = [l for l in lignes if re.match(r"^\s+ok\s+\d+ \[chromium\]", l)]
    if not echecs and not oks:
        return "NON-DÉMARRÉE", "aucune ligne de test [chromium] (serveurs ? base ? préchauffage ?)"
    if titres is None or not echecs:
        return ("VERT" if not echecs else "ROUGE"), f"ok {len(oks)} · x {len(echecs)}"
    blocs = blocs_echec(sortie)
    details = []
    for titre in titres:
        if not any(titre in l for l in echecs):
            return "SANS-TITRE", f"x {len(echecs)}, aucun ne porte « {titre[:60]}… »"
        if any(titre in l and l.rstrip().endswith("(0ms)") for l in echecs):
            return "NON-DÉMARRÉE", f"« {titre[:40]}… » a échoué en 0 ms : son corps n'a pas tourné (crochet en échec)"
        bloc = next((b for tete, b in blocs.items() if titre in tete), None)
        if bloc is None:
            return "PAS-ASSERTION", f"aucun bloc d'erreur pour « {titre[:40]}… »"
        if "expect(" not in bloc:
            return "PAS-ASSERTION", f"le bloc de « {titre[:40]}… » ne porte pas « expect( »"
        if CAUSE not in bloc:
            return "AUTRE-CAUSE", f"le bloc de « {titre[:40]}… » ne porte pas « {CAUSE} » : la garde a rougi, mais PAS par la cause nommée"
        details.append(next((l.strip() for l in bloc.splitlines() if l.strip().startswith("Error:")), "—")[:90])
    return "MORD", f"ok {len(oks)} · x {len(echecs)} · " + " | ".join(details)


# ── CALIBRATION DU LECTEUR, à chaque lancement : chaque bras doit rendre SON verdict, sinon ABANDON (D286). Formes des sorties RÉELLES de Playwright 1.50.1 (rapporteur `list`),
# relevées dans la sortie de la reproduction de ce lot (`docs/preuves/D343/reproduction/rouge-avant.txt`) : « Error: expect(received).resolves.toMatchObject() », « Rejected to value ».
_T1, _T2 = "titre un", "titre deux"
_X = lambda n, t, d="(1.0s)": f"  x  {n} [chromium] › specs\\a.e2e.ts:1:1 › {t} {d}\n"  # noqa: E731
_B = lambda n, t, corps: f"\n  {n}) [chromium] › specs\\a.e2e.ts:1:1 › {t} \n\n{corps}\n    attachment #1: trace\n"  # noqa: E731
_RESET = "    Error: expect(received).resolves.toMatchObject()\n\n    Received promise rejected instead of resolved\n    Rejected to value: [Error: POST … a échoué après 5 ms.\n      Error [ECONNRESET]: read ECONNRESET]\n"
_AUTRE = "    Error: expect(received).resolves.toMatchObject()\n\n    Received promise rejected instead of resolved\n    Rejected to value: [Error: POST … a échoué après 30000 ms.\n      Error [ECONNREFUSED]: connect ECONNREFUSED]\n"
CALIBRATION = [
    ("deux titres, deux assertions par ECONNRESET", _X(2, _T1) + _X(3, _T2) + _B(1, _T1, _RESET) + _B(2, _T2, _RESET) + "  2 failed\n", [_T1, _T2], "MORD"),
    ("deux titres attendus, un seul en « x »", _X(2, _T1) + "  ok 3 [chromium] › specs\\a.e2e.ts:2:1 › titre deux (1.0s)\n" + _B(1, _T1, _RESET) + "  1 failed\n", [_T1, _T2], "SANS-TITRE"),
    ("le SECOND bloc est un plantage, le premier une assertion (découpage des blocs)", _X(2, _T1) + _X(3, _T2) + _B(1, _T1, _RESET) + _B(2, _T2, "    Error: page.goto: net::ERR_CONNECTION_REFUSED\n") + "  2 failed\n", [_T1, _T2], "PAS-ASSERTION"),
    ("une assertion qui rougit mais PAS par ECONNRESET (serveur absent)", _X(2, _T1) + _B(1, _T1, _AUTRE) + "  1 failed\n", [_T1], "AUTRE-CAUSE"),
    ("crochet en échec (0 ms)", _X(2, _T1, "(0ms)") + _B(1, _T1, "    Error: beforeAll a échoué\n") + "  1 failed\n", [_T1], "NON-DÉMARRÉE"),
    ("rien d'exécuté", "Error: Timed out waiting 180000ms from config.webServer.\n", [_T1], "NON-DÉMARRÉE"),
    ("aucun échec sous mutation", "  ok 2 [chromium] › specs\\a.e2e.ts:1:1 › titre un (1.0s)\n  1 passed\n", [_T1], "VERT"),
]


def calibrer() -> bool:
    manques = 0
    for nom, texte, titres, attendu in CALIBRATION:
        verdict, _ = lire_playwright(texte, titres)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    print(f"  calibration : {len(CALIBRATION)} bras · {manques} manqué(s) (attendu 0)")
    return manques == 0


def _ecrire_manifeste(actions: list) -> None:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    io.open(MANIFESTE, "w", encoding="utf-8", newline="").write(json.dumps(actions, ensure_ascii=False))


def _defaire(actions: list) -> None:
    for action in reversed(actions):
        io.open(action["chemin"], "w", encoding="utf-8", newline="").write(action["contenu"])


def restaurer_si_interrompu() -> None:
    if os.path.isfile(MANIFESTE):
        actions = json.load(io.open(MANIFESTE, encoding="utf-8"))
        _defaire(actions)
        print(f"↺ arbre restauré après une exécution interrompue ({len(actions)} fichier(s)).")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def verifier_arbre(moment: str) -> bool:
    """Chaque ancre est là, UNE fois, et aucun marqueur de mutation ne traîne."""
    ecarts = []
    for c in CIBLES:
        src = io.open(c["fichier"], encoding="utf-8", newline="").read()
        if src.count(c["avant"]) != 1 or src.count(c["apres"]) != 0:
            ecarts.append(f"{c['libelle'][:6]} : ancre ×{src.count(c['avant'])}, marqueur ×{src.count(c['apres'])}")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def main(argv: list[str]) -> int:
    modes = {"unit"} | ({"e2e"} if "--e2e" in argv else set())
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    os.makedirs(JOURNAUX, exist_ok=True)

    jouees = [c for c in CIBLES if MODE[c["mesure"]] in modes]
    horsjeu = [c for c in CIBLES if MODE[c["mesure"]] not in modes]
    print(f"cibles : {len(CIBLES)} déclarées · {len(jouees)} jouées ({', '.join(sorted(modes))}) · {len(horsjeu)} hors exécution")

    if jouees:
        r = subprocess.run([_binaire("pnpm"), "--filter", "@zwadj/e2e", "exec", "playwright", "--version"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if PLAYWRIGHT_ATTENDU not in (r.stdout or ""):
            print(f"✗ PLAYWRIGHT NON ATTENDU : « {(r.stdout or '').strip()} » ({PLAYWRIGHT_ATTENDU} attendu) — refus de juger.")
            return 2
        print(f"  playwright : {PLAYWRIGHT_ATTENDU}")

    # ── PRÉ-VOL : chaque mesure utilisée, SANS mutation, doit être verte et avoir DÉMARRÉ (au moins un test exécuté — D312).
    for mesure in sorted({c["mesure"] for c in jouees}):
        code, sortie = lancer(mesure)
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(sortie)
        verdict, detail = lire_playwright(sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible in jouees:
        chemin = cible["fichier"]
        source = io.open(chemin, encoding="utf-8", newline="").read()
        ancre_avant, marque_avant = source.count(cible["avant"]), source.count(cible["apres"])
        if ancre_avant != 1:
            print(f"✗ {cible['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {chemin}")
            erreurs.append(cible["libelle"])
            break
        mute = source.replace(cible["avant"], cible["apres"])
        ancre_apres, marque_apres = mute.count(cible["avant"]), mute.count(cible["apres"])
        if (ancre_apres, marque_apres) != (0, marque_avant + 1):
            print(f"✗ {cible['libelle']}\n   MUTATION NON POSÉE : ancre {ancre_avant}→{ancre_apres}, "
                  f"marqueur {marque_avant}→{marque_apres} (attendu 1→0 et {marque_avant}→{marque_avant + 1})")
            erreurs.append(cible["libelle"])
            break
        annuler = [{"chemin": chemin, "contenu": source}]
        _ecrire_manifeste(annuler)
        io.open(chemin, "w", encoding="utf-8", newline="").write(mute)
        try:
            code, sortie = lancer(cible["mesure"])
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
        # La sortie ENTIÈRE se journalise : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        ident = cible["libelle"].split(".")[0]
        io.open(os.path.join(JOURNAUX, f"{ident}.log"), "w", encoding="utf-8").write(sortie)
        verdict, detail = lire_playwright(sortie, cible["titres"])
        posee = f"ancre 1→0 · marqueur {marque_avant}→{marque_avant + 1}"
        if verdict == "MORD" and code != 0:
            mordu += 1
            print(f"✓ {cible['libelle']}\n   {posee} · code {code} · {detail}")
        elif verdict == "NON-DÉMARRÉE":
            print(f"✗ {cible['libelle']}\n   MESURE NON DÉMARRÉE : {detail}")
            erreurs.append(cible["libelle"])
            break
        else:
            muettes.append(cible["libelle"])
            print(f"✗ {cible['libelle']}\n   {posee} · code {code} · {verdict} — {detail}")

    for c in horsjeu:
        print(f"  NON MESURÉE : {c['libelle']} — mesure « {c['mesure']} », relancer avec --{MODE[c['mesure']]}")
    conforme = verifier_arbre("À L'ARRIVÉE")
    print(f"\n{mordu} garde(s) mordue(s) sur {len(jouees)} cible(s) jouée(s) · {len(horsjeu)} non mesurée(s) "
          f"(attendu : {len(jouees)} sur {len(jouees)})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    if muettes:
        return 1
    return 3 if horsjeu else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
