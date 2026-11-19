#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 55 (D353), « la mémoire du site client » : le `no-store` de la carte (R-4), « sans créneau actif, avec une date » sur la carte (R-5)
la lecture des référentiels (R-3) et la garde durcie de `r48` (R-1).

Chaque cible MUTE le code (jamais le test) pour faire apparaître le défaut que la garde nomme, joue la mesure, et LIT l'échec du test visé : il doit être une ASSERTION
(`AssertionError` de vitest, `expect(` de Playwright — D304, D323). Le lot ne change aucune ligne d'application pour R-4 et R-5 ; la mutation dure le temps d'une mesure,
puis le fichier est restauré à l'octet (D318).
Cibles : R55-1 la carte lue SANS CACHE (unitaire, client) · R55-2 et R55-3 la carte fait EXACTEMENT ce que fait la liste, une date demandée (`--int`, PostgreSQL réel) · R55-4 à R55-9 une réponse
VIDE n'est jamais crue, un échec n'est pas relu (unitaire, client) · R55-10 `r48` jouée SEULE depuis un cache empoisonné (`--e2e`, serveurs de développement, base `zwadj_e2e`).

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r55.py            # les cibles unitaires ; les cibles --int / --e2e : NON JOUÉES (code 3)
    python3 neutralisation/neutralize-r55.py --int      # + les cibles d'intégration (Docker lancé, `zwadj-db` « Up »)
    python3 neutralisation/neutralize-r55.py --e2e      # + les cibles e2e (serveurs de dev, base zwadj_e2e)
    R55_DECOUVERTE=1 python3 neutralisation/neutralize-r55.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, mutation non posée, vitest non attendu, calibration
manquée, ou arbre non conforme ; 3 = campagne INCOMPLÈTE (cibles d'un mode non demandé : « non jouées », jamais « vertes »).

⛔ L'EMPREINTE DU HARNAIS EN TÊTE DE CHAQUE JOURNAL (R-9 de D349) : première ligne de la sortie et de CHAQUE journal de mesure ; un harnais modifié en cours de campagne ⇒ la
campagne est rejouée EN ENTIER.
⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316, D323) : la ligne « Tests » compte au moins un test en échec ; le titre attendu y est marqué
en échec ET la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. Un délai, un `TypeError`, une collecte à zéro ne sont JAMAIS
une morsure. ⛔ UNE ERREUR DE REQUÊTE DE TESTING LIBRARY N'EST PAS UNE MORSURE (S-192 refusée, D352). ⚠ `.expect(<statut>)` de supertest lève une `Error`, pas une
`AssertionError` (D305) : les cibles d'intégration se lisent sur des `expect` de vitest.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION. ⚠ Le remplacement d'une substitution ne doit jamais être une SOUS-CHAÎNE de son
ancre (D325).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R55_DECOUVERTE=1` liste, par cible, ce qui rougit.

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Le `no-store` de la carte n'était affirmé par AUCUN test : la mutation de D351 laissait la suite
ENTIÈRE du client verte (47 fichiers / 564 tests, `docs/preuves/D351/r4/`). Lecteurs, calibration et boucle : COPIÉS de `neutralize-r54.py` (état de D352) et `neutralize-r49.py`
(lecteur Playwright, D323) ; changent le jeu de cibles et les mesures.
"""

import base64
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
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

# ⛔ LA PREMIÈRE LIGNE DE LA SORTIE : l'empreinte du fichier qui joue la passe.
EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")

SAUVEGARDE = ".neutralisation-r55"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r55")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R55_DECOUVERTE") == "1"
MODES = {"unit"} | ({"int"} if "--int" in sys.argv else set()) | ({"e2e"} if "--e2e" in sys.argv else set())

# mesure → (commande, lecteur, mode)
MESURES = {
    "client-api": (["pnpm", "--filter", "@zwadj/client", "exec", "vitest", "run", "src/lib/api.test.ts"], "vitest", "unit"),
    "int-carte": (["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/venue-map.int-spec.ts"], "vitest", "int"),
    # `r48` JOUÉE SEULE (avec sa dépendance de projet, le préchauffage), depuis l'état E : c'est la forme qui rougissait (D353, `docs/preuves/D353/rouges/`).
    "e2e-r48": (["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "specs/r48-assistant-choix.e2e.ts"], "playwright", "e2e"),
}

API = "apps/client/src/lib/api.ts"
SVC = "apps/api/src/venues/venues-public.service.ts"

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit survivre (1→1) tandis que le marqueur passe de n à n+1."""
    mode = "e2e" if any(MESURES[m.split("#")[0]][2] == "e2e" for m in mesures) else ("int" if any(MESURES[m.split("#")[0]][2] == "int" for m in mesures) else "unit")
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre, "mode": mode})


A_DECOUVRIR = "?"

# ── R-4 — la carte est lue SANS CACHE.
cible("R55-1. ⛔ R-4 — `getVenueMap` lit l'API avec `cache: \"force-cache\"` : une carte gardée annonce des salles retirées (la mutation de D351 laissait 564 tests verts)", API,
      '`?${suffixe}`}`, { cache: "no-store", signal }', '`?${suffixe}`}`, { cache: "force-cache", signal }',
      {"client-api": "la carte est lue SANS CACHE"})

# ── R-5 — « sans créneau actif », AVEC une date : la carte fait EXACTEMENT ce que fait la liste.
cible("R55-2. ⛔ R-5 — la carte ignore la date demandée : elle garde les salles sans créneau actif que la liste exclut", SVC,
      "    const { where } = this.publicFilter(query, Date.now());",
      "    const { where } = this.publicFilter({ ...query, availableOn: undefined }, Date.now());",
      {"int-carte": "AVEC une date : seule la salle à créneau ACTIF reste"})
cible("R55-3. ⛔ R-5 — le filtre public perd sa clause « sans créneau actif » (la liste ET la carte la perdent ENSEMBLE : l'égalité tient, la règle du produit non)", SVC,
      "...(annotateOn === null ? {} : { slotTemplates: { some: ACTIVE_SLOT } }),",
      "...(annotateOn === null ? {} : {}),",
      {"int-carte": "AVEC une date : seule la salle à créneau ACTIF reste"})

# ── R-3 — les référentiels : une réponse VIDE n'est jamais crue (`lireReferentiel`, `api.ts`). Chaque cible retire UN geste ; les tests de `api.test.ts` (`describe.each` sur les trois fonctions) doivent rougir.
REL = "la mémoire d'un référentiel"
cible("R55-4. ⛔ R-3 — une réponse VIDE n'est plus relue : la liste vide gardée est rendue (les filtres restent vides une heure alors que l'API est pleine)", API,
      "    if (liste.length > 0) return liste;", "    if (liste.length >= 0) return liste;",
      {"client-api": "réponse VIDE gardée : relue SANS CACHE"})
cible("R55-5. ⛔ R-3 — la relecture d'une réponse vide se fait AVEC le cache (elle rendrait encore l'entrée vide gardée)", API,
      '    const fraiche = await fetch(url, { cache: "no-store" });', "    const fraiche = await fetch(url, { next: { revalidate: 3600 } });",
      {"client-api": "réponse VIDE gardée : relue SANS CACHE"})
cible("R55-6. ⛔ R-3 — la relecture est faite, mais c'est la liste vide gardée qui est rendue", API,
      "    return (await fraiche.json()) as T[];", "    return liste;",
      {"client-api": "réponse VIDE gardée : relue SANS CACHE"})
cible("R55-7. ⛔ R-3 — une liste PLEINE n'est plus gardée une heure (lue sans cache : trois lectures de plus à CHAQUE vue)", API,
      "    const res = await fetch(url, { next: { revalidate: 3600 } });", '    const res = await fetch(url, { cache: "no-store" });',
      {"client-api": "liste PLEINE : UNE seule lecture, gardée une heure"})
cible("R55-8. ⛔ R-3 — un échec (réponse non ok) est relu au lieu de rendre `[]` tout de suite", API,
      "    if (!res.ok) return [];", "    if (res.ok === undefined) return [];",
      {"client-api": "réponse non ok : `[]` et UNE seule lecture"})
cible("R55-9. ⛔ R-3 — la relecture qui échoue (500) rend le corps de l'erreur comme une liste", API,
      "    if (!fraiche.ok) return [];", "    if (fraiche.ok === undefined) return [];",
      {"client-api": "la RELECTURE qui échoue"})

# ── R-1 — `r48` JOUÉE SEULE depuis l'état E (cache de données EMPOISONNÉ, fabriqué par le harnais) : la garde durcie mord. La seule neutralisation qui l'atteint est la relecture de R-3 ;
# les trois gestes e2e (sonde statique, semis, purge) ont été mesurés NÉCESSAIRES avant R-3 et REDONDANTS après — ils ne sont pas livrés (`docs/preuves/D353/mesures/choix-e2e.md`).
R48 = "R-1 : les choix de l'assistant reparaissent"
cible("R55-10. ⛔ R-1 — la relecture d'une réponse vide est retirée : `r48` jouée SEULE depuis un cache EMPOISONNÉ rougit (la liste des communes est vide) — l'assertion durcie de `r48` mord", API,
      "    if (liste.length > 0) return liste;", "    if (liste.length >= 0) return liste;",
      {"e2e-r48": R48})


def _mesure_de(cle: str) -> str:
    return cle.split("#")[0]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


# L'ÉTAT E (D353) : le cache de données du client, EMPOISONNÉ — trois entrées à 200 portant `[]`, mtimes frais. Les noms de fichiers sont des empreintes de l'URL et des options,
# STABLES d'une passe à l'autre (relevé : les mêmes trois noms dans tous les listages de `docs/preuves/D353/rouges/cache-*.txt`).
CACHE_CLIENT = os.path.join("apps", "client", ".next", "cache", "fetch-cache")
ENTREES_E = {
    "6d7fe5bbd785a1ab56a3d19bd2027c1ab5db62c6d13bfefd9b57aabe91ff7586": "venue-styles",
    "94ffb11e5f6cdb07f876976127c49631877c6069c190a147dd50edececf0c41e": "wilayas",
    "cecfb805c24bab6ee5333dea7f5553258aca632c7f86f8a8263d6e4f9a54362e": "amenities",
}


def preparer_etat_e() -> None:
    shutil.rmtree(CACHE_CLIENT, ignore_errors=True)
    os.makedirs(CACHE_CLIENT)
    for nom, chemin in ENTREES_E.items():
        entree = {"kind": "FETCH", "revalidate": 3600, "tags": [], "data": {
            "headers": {"content-type": "application/json; charset=utf-8", "content-length": "2"},
            "body": base64.b64encode(b"[]").decode("ascii"), "status": 200, "url": f"http://localhost:3101/api/v1/{chemin}"}}
        io.open(os.path.join(CACHE_CLIENT, nom), "w", encoding="utf-8", newline="").write(json.dumps(entree))


def lancer(mesure: str) -> tuple[int, str]:
    if MESURES[_mesure_de(mesure)][2] == "e2e":
        preparer_etat_e()
    cmd = MESURES[_mesure_de(mesure)][0]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace", env={**os.environ, "NO_COLOR": "1", "FORCE_COLOR": "0"})
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
    Copie du lecteur de `neutralize-r54.py` : une erreur de REQUÊTE de Testing Library n'est PAS une morsure (S-192 refusée)."""
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
    lignes = sortie.splitlines()
    premiere = "—"
    for i, l in enumerate(lignes):
        if l.strip().startswith("FAIL ") and titre in l:
            premiere = next((x.strip() for x in lignes[i + 1:] if x.strip() and not x.strip().startswith("FAIL ")), "—")
            break
    if premiere.startswith("AssertionError"):
        return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"
    return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"


def lire_playwright(sortie: str, titre: str | None) -> tuple[str, str]:
    """Lecteur Playwright de `neutralize-r49.py` (D323) : une assertion web-first qui expire EST une morsure si le bloc d'erreur porte `expect(` ; un crochet en échec en 0 ms est NON-DÉMARRÉE."""
    echecs = [l for l in sortie.splitlines() if re.match(r"^\s+x\s+\d+ \[chromium\]", l)]
    oks = [l for l in sortie.splitlines() if re.match(r"^\s+ok\s+\d+ \[chromium\]", l)]
    if not echecs and not oks:
        return "NON-DÉMARRÉE", "aucune ligne de test [chromium] (serveurs ? base ?)"
    if titre is None or not echecs:
        return ("VERT" if not echecs else "ROUGE"), f"ok {len(oks)} · x {len(echecs)}"
    if not any(titre in l for l in echecs):
        return "SANS-TITRE", f"x {len(echecs)}, aucun ne porte « {titre} »"
    if any(titre in l and l.rstrip().endswith("(0ms)") for l in echecs):
        return "NON-DÉMARRÉE", "le test visé a échoué en 0 ms : son corps n'a pas tourné (crochet en échec)"
    bloc = re.search(rf"\d+\) \[chromium\] .*{re.escape(titre)}.*?\n(.*?)attachment #1", sortie, re.S)
    texte = bloc.group(1) if bloc else ""
    if "expect(" not in texte:
        return "PAS-ASSERTION", "le bloc d'erreur ne porte pas « expect( »"
    premiere = next((l.strip() for l in texte.splitlines() if l.strip().startswith("Error:")), "—")
    return "MORD", f"ok {len(oks)} · x {len(echecs)} · {premiere[:140]}"


def lire(mesure: str, sortie: str, titre: str | None) -> tuple[str, str]:
    return lire_playwright(sortie, titre) if MESURES[_mesure_de(mesure)][1] == "playwright" else lire_vitest(sortie, titre)


def echecs_de(sortie: str) -> list[tuple[str, str]]:
    """Mode DÉCOUVERTE : (titre, première ligne de son bloc) pour chaque test en échec. Les en-têtes REGROUPÉS partagent le message qui les suit."""
    lignes = sortie.splitlines()
    rendus: list[tuple[str, str]] = []
    i = 0
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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras de `neutralize-r54.py` et `neutralize-r49.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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
    ("vitest, erreur de REQUÊTE Testing Library : PAS une morsure (S-192 refusée, D352)", "vitest", _V
     + "   × d > t 1105ms\n FAIL  a.test.ts > d > t\nTestingLibraryElementError: Unable to find an element with the text: x\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("vitest, supertest `.expect(<statut>)` lève une Error, pas une AssertionError (D305)", "vitest", _V
     + "   × d > t 40ms\n FAIL  a.test.ts > d > t\nError: expected 400 \"Bad Request\", got 200 \"OK\"\n      Tests  1 failed | 8 passed (9)\n", "t", "PAS-ASSERTION"),
    ("vitest, rien d'exécuté sous filtre", "vitest", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("vitest, autre version", "vitest", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("vitest, crochet en échec (bloc de FICHIER, 1 skipped)", "vitest", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
    ("vitest, le titre attendu n'échoue pas (un autre, si)", "vitest", _V
     + "   × d > une autre garde 3ms\n FAIL  a.test.ts > d > une autre garde\nAssertionError: expected 1 to be 2\n"
       "      Tests  1 failed | 4 passed (5)\n", "garde visée par la cible", "SANS-TITRE"),
    ("vitest, délai dépassé (jamais une morsure)", "vitest", _V
     + "   × d > t 5001ms\n FAIL  a.test.ts > d > t\nError: Test timed out in 5000ms.\n      Tests  1 failed | 7 passed (8)\n", "t", "PAS-ASSERTION"),
    ("playwright, assertion (web-first qui expire)", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n"
     "    Error: message\n\n    Timed out 7000ms waiting for expect(locator).toHaveCount(expected)\n\n"
     "    attachment #1: screenshot\n", "titre", "MORD"),
    ("playwright, plantage sans expect(", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n"
     "    Error: page.goto: net::ERR_CONNECTION_REFUSED\n\n    attachment #1: screenshot\n", "titre", "PAS-ASSERTION"),
    ("playwright, rien d'exécuté", "e2e", "Error: Timed out waiting 180000ms from config.webServer.\n", "titre", "NON-DÉMARRÉE"),
    ("playwright, crochet en échec (0 ms, did not run)", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:30:7 › titre (0ms)\n  -  3 [chromium] › specs\\a.e2e.ts:30:7 › autre\n\n"
     "  1) [chromium] › specs\\a.e2e.ts:30:7 › titre \n\n    Error: POST http://localhost:3101/api/v1/auth/register a échoué"
     " après 66 ms.\n      TypeError: fetch failed\n\n    attachment #1: trace\n  1 failed\n  1 did not run\n", "titre", "NON-DÉMARRÉE"),
]


def calibrer() -> bool:
    manques = 0
    for nom, genre, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_playwright(texte, titre) if genre == "e2e" else lire_vitest(texte, titre)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    decouverte = echecs_de(_V + " FAIL  a.test.ts > d > un\n FAIL  a.test.ts > d > deux\nAssertionError: m1\n\n FAIL  a.test.ts > d > trois\nTypeError: m2\n")
    attendu_decouverte = [("FAIL  a.test.ts > d > un", "AssertionError: m1"), ("FAIL  a.test.ts > d > deux", "AssertionError: m1"),
                          ("FAIL  a.test.ts > d > trois", "TypeError: m2")]
    ok = decouverte == attendu_decouverte
    manques += not ok
    print(f"  calibration {'✓' if ok else '✗'} découverte : {len(decouverte)} échec(s) lu(s) (attendu 3)")
    print(f"  calibration : {len(CALIBRATION) + 1} bras · {manques} manqué(s) (attendu 0)")
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


def _edits(c: dict) -> list[tuple[str, str, str]]:
    """Les éditions d'une cible (une : la sienne)."""
    return [(c["fichier"], c["avant"], c["apres"])]


def empreintes() -> dict[str, str]:
    return {f: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in sorted({e[0] for c in CIBLES for e in _edits(c)})}


def _adapter(texte: str, source: str) -> str:
    """Les ancres multi-lignes sont écrites en `\\n` : un fichier en CRLF les porte en `\\r\\n` (D325 : « un motif multi-lignes doit porter `\\r\\n` »)."""
    return texte.replace("\n", "\r\n") if "\r\n" in source else texte


def verifier_arbre(moment: str, depart: dict[str, str] | None = None) -> bool:
    """Chaque ancre est là, UNE fois ; à l'arrivée, chaque fichier ciblé a l'EMPREINTE du départ (restauration prouvée à l'octet)."""
    ecarts = []
    for c in CIBLES:
        for fichier, avant, _apres in _edits(c):
            src = io.open(fichier, encoding="utf-8", newline="").read()
            n = src.count(_adapter(avant, src))
            if n != 1:
                ecarts.append(f"{c['libelle'][:7]} : ancre ×{n} dans {fichier}")
    if depart is not None:
        maintenant = empreintes()
        ecarts += [f"{f} : empreinte changée" for f in depart if depart[f] != maintenant[f]]
        print(f"  empreintes : {len(depart)} fichier(s) ciblé(s) comparé(s) au départ · {sum(depart[f] != maintenant[f] for f in depart)} différent(s) (attendu 0)")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def _entete_journal() -> str:
    """⛔ R-9 : la PREMIÈRE ligne de chaque journal est l'empreinte du harnais."""
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\n"


def main() -> int:
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    a_jouer = [c for c in CIBLES if c["mode"] in MODES]
    non_jouees = [c for c in CIBLES if c["mode"] not in MODES]
    sans_titre = [c["libelle"].split(".")[0] for c in a_jouer for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R55_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({_mesure_de(m) for c in a_jouer for m in c["mesures"]})
    print(f"cibles : {len(CIBLES)} déclarées · {len(a_jouer)} jouée(s) dans les modes {sorted(MODES)} · {len(non_jouees)} NON JOUÉE(S) (mode non demandé) · {len(mesures_utilisees)} mesure(s) distincte(s) · "
          f"{len({e[0] for c in a_jouer for e in _edits(c)})} fichier(s) muté(s)")

    # ── PRÉ-VOL : chaque mesure, SANS mutation, doit être verte et avoir DÉMARRÉ.
    for mesure in mesures_utilisees:
        code, sortie = lancer(mesure)
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(_entete_journal() + sortie)
        verdict, detail = lire(mesure, sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible_ in a_jouer:
        edits = _edits(cible_)
        contenus = {f: io.open(f, encoding="utf-8", newline="").read() for f in dict.fromkeys(e[0] for e in edits)}
        originaux = dict(contenus)
        posees = []
        ratee = False
        for k, (chemin, a_av, a_ap) in enumerate(edits):
            source = contenus[chemin]
            avant, apres = _adapter(a_av, source), _adapter(a_ap, source)
            ancre_avant, marque_avant = source.count(avant), source.count(apres)
            if ancre_avant != 1:
                print(f"✗ {cible_['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {chemin}")
                erreurs.append(cible_["libelle"])
                ratee = True
                break
            mute = source.replace(avant, apres)
            ancre_apres, marque_apres = mute.count(avant), mute.count(apres)
            genre = cible_["genre"] if k == 0 else "substitution"
            ancre_attendue = 1 if genre == "insertion" else 0
            if (ancre_apres, marque_apres) != (ancre_attendue, marque_avant + 1):
                print(f"✗ {cible_['libelle']}\n   MUTATION NON POSÉE ({chemin}) : ancre {ancre_avant}→{ancre_apres}, "
                      f"marqueur {marque_avant}→{marque_apres} (attendu 1→{ancre_attendue} et {marque_avant}→{marque_avant + 1}, genre {genre})")
                erreurs.append(cible_["libelle"])
                ratee = True
                break
            contenus[chemin] = mute
            posees.append(f"{os.path.basename(chemin)} : ancre 1→{ancre_attendue} · marqueur {marque_avant}→{marque_avant + 1} · genre {genre}")
        if ratee:
            break
        annuler = [{"chemin": f, "contenu": originaux[f]} for f in originaux]
        _ecrire_manifeste(annuler)
        for f, mute in contenus.items():
            io.open(f, "w", encoding="utf-8", newline="").write(mute)
        sorties: dict[str, tuple[int, str]] = {}
        try:
            for mesure in {_mesure_de(m) for m in cible_["mesures"]}:
                sorties[mesure] = lancer(mesure)
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
        ident = cible_["libelle"].split(".")[0]
        posee = " | ".join(posees)
        # La sortie ENTIÈRE se journalise, après l'empreinte du harnais (R-9) : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        for mesure, (code, sortie) in sorties.items():
            io.open(os.path.join(JOURNAUX, f"{ident}-{mesure}.log"), "w", encoding="utf-8").write(_entete_journal() + sortie)
        if DECOUVERTE:
            print(f"■ {cible_['libelle']}\n   {posee}")
            for mesure, (code, sortie) in sorties.items():
                verdict, detail = lire(mesure, sortie, None)
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")
                for titre, message in echecs_de(sortie):
                    print(f"      {titre[:200]}\n         ↳ {message[:150]}")
            continue
        verdicts = []
        for cle, titre in cible_["mesures"].items():
            code, sortie = sorties[_mesure_de(cle)]
            verdict, detail = lire(cle, sortie, titre)
            verdicts.append((cle, code, verdict, detail))
        if any(v in ("NON-DÉMARRÉE", "VERSION") for _, _, v, _ in verdicts):
            for mesure, code, verdict, detail in verdicts:
                print(f"✗ {cible_['libelle']}\n   [{mesure}] MESURE NON DÉMARRÉE ({verdict}) : {detail}")
            erreurs.append(cible_["libelle"])
            break
        if all(v == "MORD" and code != 0 for _, code, v, _ in verdicts):
            mordu += 1
            print(f"✓ {cible_['libelle']}\n   {posee}")
            for mesure, code, verdict, detail in verdicts:
                print(f"   [{mesure}] code {code} · {detail}")
        else:
            muettes.append(cible_["libelle"])
            print(f"✗ {cible_['libelle']}\n   {posee}")
            for mesure, code, verdict, detail in verdicts:
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")

    conforme = verifier_arbre("À L'ARRIVÉE", depart)
    if DECOUVERTE:
        print(f"\nDÉCOUVERTE : {len(a_jouer)} cible(s) jouée(s), aucun verdict écrit.")
    else:
        print(f"\n{mordu} garde(s) mordue(s) sur {len(CIBLES)} cible(s) · toutes lues en AssertionError / expect( · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) · {len(non_jouees)} NON JOUÉE(S) "
              f"(attendu : {len(CIBLES)} sur {len(CIBLES)}, 0, 0, 0)")
        for c in non_jouees:
            print(f"   non jouée ({c['mode']}) : {c['libelle'][:110]}")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    if muettes:
        return 1
    return 3 if non_jouees else 0


if __name__ == "__main__":
    sys.exit(main())
