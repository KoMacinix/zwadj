#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 48 (D346) : le panneau de filtres de `/salles` suit l'adresse.

Ce que le lot ajoute, et que chaque cible neutralise : la CLÉ du panneau de filtres (`filtersKey` et son emploi dans
`search-view.tsx`). Sans elle, le panneau garde ses valeurs quand l'assistant pousse une adresse (mesuré en navigateur,
`docs/preuves/D346/reproduction/`). Une cible par champ de la clé — chacune retire UN champ, et un test À CHAMP UNIQUE doit
rougir (sinon la cible serait muette par confusion de mesure, D209) — plus une cible qui ÉLARGIT la clé (la page), que seule la
garde « changer de page ne remonte pas le formulaire » voit.

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r48.py            # cibles de composant (client) ; e2e : NON MESURÉES
    python3 neutralisation/neutralize-r48.py --e2e      # + les deux cibles vues par le navigateur (serveurs de dev, base zwadj_e2e)
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non
attendu, ou arbre non conforme ; 3 = campagne INCOMPLÈTE (cibles e2e hors exécution).

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312) : la ligne « Tests » compte au moins un test en
échec, le titre attendu porte « × », la PREMIÈRE ligne de son bloc est une `AssertionError`. Pour Playwright : le titre est sur une
ligne « x », son bloc d'erreur porte `expect(`. ⚠ Le lecteur et sa calibration (deux bras par verdict) sont ceux de `neutralize-r25.py`
(D316), recopiés à l'identique — ce lot n'est pas du chemin de l'argent. ⛔ VITEST 3.2.7 : autre version ⇒ le harnais refuse de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 (toutes les cibles sont des SUBSTITUTIONS dont le texte
remplaçant n'est PAS une sous-chaîne de l'ancre — D325).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant si une exécution a été tuée.
⚠ Le fichier muté est en CRLF : toutes les ancres sont sur UNE ligne, jamais de `
` dans un motif.

POURQUOI IL EXISTE : une clé de panneau est invisible aux six portes — retirée, tout compile, tout est vert, et le visiteur voit
des filtres qui ne disent pas ce qu'il vient de choisir. Une garde neuve dont on n'a pas montré qu'elle mord est une assurance
sans mesure derrière.
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

SAUVEGARDE = ".neutralisation-r48"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r48")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"

VUE = "apps/client/src/components/search/search-view.tsx"

MESURES = {
    "composant": ["pnpm", "--filter", "@zwadj/client", "exec", "vitest", "run", "src/components/search/search-view.test.tsx"],
    "e2e-assistant": ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "specs/r48-assistant-choix.e2e.ts"],
}
MODE = {"composant": "unit", "e2e-assistant": "e2e"}

SANS_CLE = {
    "fichier": VUE,
    "avant": "<SearchFilters key={filtersKey(state)} state={state} wilayas={wilayas} amenities={amenities} styles={styles} ar={ar} />",
    "apres": "<SearchFilters state={state} wilayas={wilayas} amenities={amenities} styles={styles} ar={ar} />",
}
SANS_BUDGET = {"fichier": VUE, "avant": "s.minPrice, s.maxPrice, s.styles", "apres": 's.minPrice, "", s.styles'}
TITRE_E2E = "R-1 : les choix de l'assistant reparaissent dans le formulaire"


def champ(libelle: str, avant: str, apres: str, titre: str) -> dict:
    return {"libelle": libelle, "fichier": VUE, "avant": avant, "apres": apres, "mesure": "composant", "titre": titre}


CIBLES = [
    {"libelle": "R48-1. ⛔ LE DÉFAUT RESTAURÉ : le panneau de filtres n'a plus de clé", **SANS_CLE, "mesure": "composant",
     "titre": "la commune choisie dans l'assistant est celle du formulaire"},
    champ("R48-2. La commune n'entre plus dans la clé", "[s.cityId, s.guests,", '["", s.guests,',
          "la commune choisie dans l'assistant est celle du formulaire"),
    champ("R48-3. Les invités n'entrent plus dans la clé", "s.cityId, s.guests, s.maxCapacity", 's.cityId, "", s.maxCapacity',
          "les invités de l'assistant sont la poignée BASSE de la capacité"),
    champ("R48-4. Le plafond de capacité n'entre plus dans la clé", "s.guests, s.maxCapacity, s.minPrice", 's.guests, "", s.minPrice',
          "le plafond de capacité seul (poignée HAUTE) suit l'adresse"),
    champ("R48-5. Le plancher de budget n'entre plus dans la clé", "s.maxCapacity, s.minPrice, s.maxPrice", 's.maxCapacity, "", s.maxPrice',
          "le plancher de budget seul (poignée BASSE) suit l'adresse"),
    champ("R48-6. Le plafond de budget n'entre plus dans la clé", SANS_BUDGET["avant"], SANS_BUDGET["apres"],
          "le budget de l'assistant est la poignée HAUTE du budget"),
    champ("R48-7. Les styles n'entrent plus dans la clé", "s.maxPrice, s.styles, s.amenities", "s.maxPrice, [], s.amenities",
          "les styles seuls : cochés dans le formulaire quand l'adresse change"),
    champ("R48-8. Les équipements n'entrent plus dans la clé", "s.styles, s.amenities, s.ceremonyType", "s.styles, [], s.ceremonyType",
          "les équipements seuls : cochés dans le formulaire quand l'adresse change"),
    champ("R48-9. Le type de cérémonie n'entre plus dans la clé", "s.amenities, s.ceremonyType]", 's.amenities, ""]',
          "le type de cérémonie de l'adresse est celui du formulaire"),
    champ("R48-10. ⛔ LA CLÉ TROP LARGE : la page entre dans la clé, changer de page efface une saisie non soumise",
          "s.amenities, s.ceremonyType]);", "s.amenities, s.ceremonyType, s.page]);",
          "changer de page ne remonte pas le formulaire : une saisie non soumise survit"),
    {"libelle": "R48-E1. ⛔ DÉFAUT RESTAURÉ, vu par le navigateur : le panneau ne suit pas l'assistant (FR et AR)", **SANS_CLE,
     "mesure": "e2e-assistant", "titre": f"fr — {TITRE_E2E}"},
    {"libelle": "R48-E2. Le budget n'entre plus dans la clé, vu par le navigateur", **SANS_BUDGET,
     "mesure": "e2e-assistant", "titre": f"ar — {TITRE_E2E}"},
]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[mesure]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION."""
    if f"RUN  {VITEST_ATTENDU}" not in sortie:
        m = re.search(r"RUN\s+(v\S+)", sortie)
        return "VERSION", f"vitest {m.group(1) if m else 'introuvable'}, {VITEST_ATTENDU} attendu"
    ligne = re.search(r"^\s*Tests\s+(.*)$", sortie, re.M)
    if not ligne:
        return "NON-DÉMARRÉE", "aucune ligne « Tests »"
    echecs = int(m.group(1)) if (m := re.search(r"(\d+) failed", ligne.group(1))) else 0
    passes = int(m.group(1)) if (m := re.search(r"(\d+) passed", ligne.group(1))) else 0
    if passes + echecs == 0:
        return "NON-DÉMARRÉE", f"exécutés 0 ({ligne.group(0).strip()})"
    if titre is None or echecs == 0:
        return ("VERT" if echecs == 0 else "ROUGE"), f"passés {passes} · en échec {echecs}"
    if not any("×" in l and titre in l for l in sortie.splitlines()):
        return "SANS-TITRE", f"en échec {echecs}, aucun « × » ne porte « {titre} »"
    # ⚠ DÉFAUT DE LECTEUR RÉPARÉ (D298), vu à la première passe : vitest REGROUPE sous un seul message les tests qui
    # échouent de la même façon — plusieurs en-têtes « FAIL … » d'affilée, PUIS l'erreur. La première version prenait
    # la ligne suivant l'en-tête du titre : c'était un autre en-tête, et elle déclarait « PAS-ASSERTION » une morsure.
    lignes = sortie.splitlines()
    premiere = "—"
    for i, l in enumerate(lignes):
        if l.strip().startswith("FAIL ") and titre in l:
            premiere = next((x.strip() for x in lignes[i + 1:] if x.strip() and not x.strip().startswith("FAIL ")), "—")
            break
    if not premiere.startswith("AssertionError"):
        return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"
    return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"


def lire_playwright(sortie: str, titre: str | None) -> tuple[str, str]:
    echecs = [l for l in sortie.splitlines() if re.match(r"^\s+x\s+\d+ \[chromium\]", l)]
    oks = [l for l in sortie.splitlines() if re.match(r"^\s+ok\s+\d+ \[chromium\]", l)]
    if not echecs and not oks:
        return "NON-DÉMARRÉE", "aucune ligne de test [chromium] (serveurs ? base ?)"
    if titre is None or not echecs:
        return ("VERT" if not echecs else "ROUGE"), f"ok {len(oks)} · x {len(echecs)}"
    if not any(titre in l for l in echecs):
        return "SANS-TITRE", f"x {len(echecs)}, aucun ne porte « {titre} »"
    # ⚠ DÉFAUT DE LECTEUR RÉPARÉ (D298, D312), vu à la campagne officielle : un `beforeAll` en échec (ici `ECONNREFUSED`,
    # l'API de développement redémarrait) marque le test « x … (0ms) » — son CORPS n'a jamais tourné, la mutation n'a
    # jamais été exercée. La première version le jugeait « PAS-ASSERTION », donc MUETTE : le faux négatif de D286, un
    # verdict sur une garde qui n'a pas été mesurée. C'est une mesure NON DÉMARRÉE, et le harnais refuse de juger.
    if any(titre in l and l.rstrip().endswith("(0ms)") for l in echecs):
        return "NON-DÉMARRÉE", "le test visé a échoué en 0 ms : son corps n'a pas tourné (crochet en échec)"
    bloc = re.search(rf"\d+\) \[chromium\] .*{re.escape(titre)}.*?\n(.*?)attachment #1", sortie, re.S)
    texte = bloc.group(1) if bloc else ""
    if "expect(" not in texte:
        return "PAS-ASSERTION", "le bloc d'erreur ne porte pas « expect( »"
    premiere = next((l.strip() for l in texte.splitlines() if l.strip().startswith("Error:")), "—")
    return "MORD", f"ok {len(oks)} · x {len(echecs)} · {premiere[:140]}"


def lire(mesure: str, sortie: str, titre: str | None) -> tuple[str, str]:
    return lire_playwright(sortie, titre) if MODE[mesure] == "e2e" else lire_vitest(sortie, titre)


# ── CALIBRATION DU LECTEUR, à chaque lancement : chaque bras doit rendre SON verdict, sinon ABANDON (D286). Les
# échantillons reproduisent des sorties RÉELLES, versées sous `docs/preuves/D316/` : le regroupement d'en-têtes
# (`neutralisation/forme-groupee-extrait.txt`), l'échec d'un matcher jest-dom (`neutralisation/campagne-r25-unit-extrait.txt`,
# R25-7), le bloc d'erreur de Playwright (`e2e/rouge-defaut1-extrait.txt`), le crochet en échec
# (`neutralisation/premiere-passe-officielle/R25-E2-extrait.txt`). ⚠ Le `TypeError` de `toMatch` sur `undefined` a été lu
# à la PREMIÈRE course rouge d'intégration, dont le journal a été ÉCRASÉ par la seconde (même nom) : sa forme — « × »,
# en-tête `FAIL`, première ligne `TypeError: …` — est celle du cas `CAS-PLANTAGE` versé par D304
# (`docs/preuves/D304/r1/signatures/sorties/tests.defaut.txt`).
_V = " RUN  v3.2.7 C:/x\n"
CALIBRATION = [
    ("vitest, en-têtes REGROUPÉS puis AssertionError", "vitest", _V
     + "   × d > 93 jour(s) : t 8ms\n   × d > 182 jour(s) : t 1ms\n"
       " FAIL  a.test.ts > d > 93 jour(s) : t\n FAIL  a.test.ts > d > 182 jour(s) : t\n"
       "AssertionError: expected false to be true // Object.is equality\n      Tests  7 failed | 9 passed (16)\n",
     "182 jour(s) : t", "MORD"),
    ("vitest, plantage (TypeError)", "vitest", _V
     + "   × d > t 219ms\n FAIL  a.test.ts > d > t\nTypeError: .toMatch() expects to receive a string, but got undefined\n"
       "      Tests  1 failed | 18 passed (19)\n", "t", "PAS-ASSERTION"),
    ("vitest, matcher jest-dom (Error, pas AssertionError)", "vitest", _V
     + "   × d > t 12ms\n FAIL  a.test.ts > d > t\nError: expect(element).toHaveAttribute(\"href\", \"/x\")\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("vitest, rien d'exécuté sous filtre", "vitest", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("vitest, autre version", "vitest", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("playwright, assertion", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n"
     "    Error: message\n\n    Timed out 7000ms waiting for expect(locator).toHaveCount(expected)\n\n"
     "    attachment #1: screenshot\n", "titre", "MORD"),
    ("playwright, plantage sans expect(", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n"
     "    Error: page.goto: net::ERR_CONNECTION_REFUSED\n\n    attachment #1: screenshot\n", "titre", "PAS-ASSERTION"),
    ("playwright, rien d'exécuté", "e2e", "Error: Timed out waiting 180000ms from config.webServer.\n", "titre",
     "NON-DÉMARRÉE"),
    # Relevé sur `.neutralisation-journaux/r25/R25-E2.log`, campagne officielle du 27/09/2026 (versé : D316).
    ("playwright, crochet en échec (0 ms, did not run)", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:30:7 › titre (0ms)\n  -  3 [chromium] › specs\\a.e2e.ts:30:7 › autre\n\n"
     "  1) [chromium] › specs\\a.e2e.ts:30:7 › titre \n\n    Error: POST http://localhost:3101/api/v1/auth/register a échoué"
     " après 66 ms.\n      TypeError: fetch failed\n\n    attachment #1: trace\n  1 failed\n  1 did not run\n", "titre",
     "NON-DÉMARRÉE"),
    # Relevé sur `docs/preuves/D304/r1/signatures/sorties/crochet.defaut.txt` (vitest 3.2.7, crochet en échec).
    ("vitest, crochet en échec (bloc de FICHIER, 1 skipped)", "vitest", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
]


def calibrer() -> bool:
    manques = 0
    for nom, genre, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_playwright(texte, titre) if genre == "e2e" else lire_vitest(texte, titre)
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
        if src.count(c["avant"]) != 1:
            ecarts.append(f"{c['libelle'][:7]} : ancre ×{src.count(c['avant'])} dans {c['fichier']}")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(sorted(set(ecarts))))
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

    # ── PRÉ-VOL : chaque mesure utilisée, SANS mutation, doit être verte et avoir DÉMARRÉ.
    for mesure in sorted({c["mesure"] for c in jouees}):
        code, sortie = lancer(mesure)
        verdict, detail = lire(mesure, sortie, None)
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
        verdict, detail = lire(cible["mesure"], sortie, cible["titre"])
        posee = f"ancre 1→0 · marqueur {marque_avant}→{marque_avant + 1}"
        if verdict == "MORD" and code != 0:
            mordu += 1
            print(f"✓ {cible['libelle']}\n   {posee} · code {code} · {detail}")
        elif verdict in ("VERSION", "NON-DÉMARRÉE"):
            print(f"✗ {cible['libelle']}\n   MESURE NON DÉMARRÉE ou non jugeable : {verdict} — {detail}")
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
