#!/usr/bin/env python3
"""SOCLE DES HARNAIS DE LA SESSION `front-client` (lots FC-n et FP-n) — un INSTRUMENT partagé, PAS une campagne.

⛔ CE FICHIER NE SE LANCE PAS SEUL, ET SON NOM NE SUIT PAS `neutralize-*.py` EXPRÈS : `lancer-campagnes.py` ne découvre que ce
motif (D272), et ce module ne mute rien, ne déclare aucune cible, ne rend aucun compte de gardes. Il est IMPORTÉ par les
harnais `neutralisation/neutralize-fc<n>.py` et `neutralisation/neutralize-fp<n>.py`, lancés depuis la RACINE du monorepo.
Seul usage direct : `python3 neutralisation/socle_front_client.py` rejoue sa calibration et ne mesure rien.

POURQUOI UN MODULE PARTAGÉ ET PAS UNE COPIE PAR HARNAIS : la session enchaîne jusqu'à dix-sept lots ; recopier dix-sept fois le
lecteur, c'est dix-sept endroits où une correction n'arrive pas (D305 : « un module partagé, pas une copie par harnais »). Les
harnais antérieurs (r26, r33, r37, r38…) gardent leur copie : ils ne sont pas touchés.

CE QU'IL APPORTE, REPRIS SANS CHANGEMENT DE SENS DES HARNAIS CALIBRÉS DU DÉPÔT :
  · `lire_vitest` — copie du lecteur de `neutralize-r38.py` (lui-même de `neutralize-r33.py`, calibré par D316, D325, D331) :
    une morsure exige un test EN ÉCHEC sur la ligne « Tests », le titre attendu sous « × », et la PREMIÈRE ligne de son bloc
    « FAIL … > titre » (en-têtes regroupés sautés) en `AssertionError` (D304, D305, D312, D316). VITEST 3.2.7 seulement.
  · `lire_playwright` — copie du lecteur de `neutralize-r26.py` (Playwright 1.50.1, rapporteur `list`), avec la règle du
    relecteur de D323 : une assertion web-first expirée EST une morsure si son bloc montre l'appel `expect(` ; un délai de test
    ou d'action n'en est pas une ; un échec en 0 ms est un crochet, la mesure n'a pas démarré.
  · la CALIBRATION des deux lecteurs, rejouée à CHAQUE lancement, en mémoire ; ABANDON si un seul bras manque (D286). Les bras
    sont ceux des deux harnais d'origine, à l'identique, plus deux bras propres à ce socle (marqués « socle »).
  · la PREUVE QUE LA MUTATION EST POSÉE, par genre (D286) : SUBSTITUTION ancre 1→0 ET marqueur n→n+1 (et le remplacement n'est
    JAMAIS une sous-chaîne de l'ancre, D325 — refusé dès la déclaration) ; INSERTION le remplacement contient l'ancre : ancre
    1→1 ET marqueur n→n+1 ; SUPPRESSION remplacement vide : ancre 1→0, marqueur sans objet.
  · SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE (manifeste) avant toute mutation, restaurée au démarrage suivant ; à l'arrivée,
    chaque fichier muté a l'EMPREINTE du départ (restauration prouvée à l'octet).
  · le mode DÉCOUVERTE (`<NOM>_DECOUVERTE=1`) : n'écrit AUCUN verdict, liste par cible les tests qui rougissent et la première
    ligne de leur bloc — les titres attendus se RELÈVENT, ils ne s'écrivent pas de mémoire.
  · les cibles e2e ne se jouent qu'avec `--e2e` (patron de `neutralize-r26.py`) : sans lui, elles s'impriment « NON MESURÉE »
    et la campagne sort en 3 (incomplète), jamais en 0.

CALIBRATION : `python3 neutralisation/socle_front_client.py` → chaque bras imprime son verdict et l'attendu ; « N bras · 0
manqué(s) (attendu 0) ». Calibré à sa naissance, le 05/11/2026, dans la session `front-client` (sortie versée par FC-1).
INSTRUMENTS CONCURRENTS ÉCARTÉS : recopier r38 ou r26 dans chaque harnais (voir plus haut) ; lire le rapport JSON de vitest —
écarté par D298 (vitest 3.2.7 n'y met pas le message d'un délai dépassé) ; juger au code de sortie — écarté par D304 (un
plantage, une collecte vide et un crochet en échec sortent tous en 1).
"""
from __future__ import annotations

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

ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
PLAYWRIGHT_ATTENDU = "1.50.1"
A_DECOUVRIR = "?"


def exiger_racine(script: str) -> None:
    if not os.path.isfile("pnpm-workspace.yaml"):
        print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
        print(f"  dossier courant : {os.getcwd()}")
        print(f"  → python3 neutralisation/{os.path.basename(script)}")
        sys.exit(2)


def binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def vitest(paquet: str, fichier: str) -> dict:
    return {"genre": "vitest", "mode": "unit", "cmd": ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]}


def playwright(spec: str, grep: str | None = None) -> dict:
    cmd = ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", spec, "--reporter", "list"]
    if grep is not None:
        cmd += ["--grep", grep]
    return {"genre": "playwright", "mode": "e2e", "cmd": cmd}


# ══ LECTEUR VITEST — copie de `neutralize-r38.py`, mêmes verdicts ═══════════════════════════════════════════════════════
def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION."""
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
    if not premiere.startswith("AssertionError"):
        return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"
    return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"


def echecs_vitest(sortie: str) -> list[tuple[str, str]]:
    """Mode DÉCOUVERTE : (titre, première ligne de son bloc) pour chaque test en échec. Les en-têtes REGROUPÉS partagent le
    message qui les suit."""
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


# ══ LECTEUR PLAYWRIGHT — copie de `neutralize-r26.py`, mêmes verdicts ═══════════════════════════════════════════════════
def blocs_playwright(sortie: str) -> dict[str, str]:
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


# ⚠ DÉFAUT D'INSTRUMENT TROUVÉ AVANT LE PREMIER USAGE (05/11/2026, règle de D298 : recalibré sur ses bras, y compris le neuf) :
# le rapporteur `list` de Playwright écrit « ok » / « x » sous Windows (poste de Ko, d'où les bras de r26) et « ✓ » / « ✘ » ailleurs
# (ce conteneur Linux — relevé dans `docs/preuves/front-client/etat-entree-e2e.md`). Le lecteur de r26 ne voyait AUCUNE ligne ici et
# aurait rendu « NON-DÉMARRÉE » à chaque mesure. Les deux formes sont lues ; les deux ont leurs bras.
MARQUE_OK = r"(?:ok|✓)"
MARQUE_ECHEC = r"(?:x|✘)"


def lire_playwright(sortie: str, titres: list[str] | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE."""
    lignes = sortie.splitlines()
    echecs = [l for l in lignes if re.match(rf"^\s+{MARQUE_ECHEC}\s+\d+ \[chromium\]", l)]
    oks = [l for l in lignes if re.match(rf"^\s+{MARQUE_OK}\s+\d+ \[chromium\]", l)]
    if not echecs and not oks:
        return "NON-DÉMARRÉE", "aucune ligne de test [chromium] (serveurs ? base ? préchauffage ?)"
    if titres is None or not echecs:
        return ("VERT" if not echecs else "ROUGE"), f"ok {len(oks)} · x {len(echecs)}"
    blocs = blocs_playwright(sortie)
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
        details.append(next((l.strip() for l in bloc.splitlines() if l.strip().startswith("Error:")), "—")[:90])
    return "MORD", f"ok {len(oks)} · x {len(echecs)} · " + " | ".join(details)


# ══ CALIBRATION — les bras des deux harnais d'origine, à l'identique, plus deux bras du socle ════════════════════════════
_V = " RUN  v3.2.7 C:/x\n"
CALIBRATION_VITEST = [
    ("en-têtes REGROUPÉS puis AssertionError", _V
     + "   × d > 93 jour(s) : t 8ms\n   × d > 182 jour(s) : t 1ms\n"
       " FAIL  a.test.ts > d > 93 jour(s) : t\n FAIL  a.test.ts > d > 182 jour(s) : t\n"
       "AssertionError: expected false to be true // Object.is equality\n      Tests  7 failed | 9 passed (16)\n",
     "182 jour(s) : t", "MORD"),
    ("plantage (TypeError)", _V
     + "   × d > t 219ms\n FAIL  a.test.ts > d > t\nTypeError: .toMatch() expects to receive a string, but got undefined\n"
       "      Tests  1 failed | 18 passed (19)\n", "t", "PAS-ASSERTION"),
    ("erreur de REQUÊTE Testing Library (pas une assertion)", _V
     + "   × d > t 1105ms\n FAIL  a.test.ts > d > t\nTestingLibraryElementError: Unable to find an element with the text: x\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("rien d'exécuté sous filtre", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("autre version", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("crochet en échec (bloc de FICHIER, 1 skipped)", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
    ("le titre attendu n'échoue pas (un autre, si)", _V
     + "   × d > une autre garde 3ms\n FAIL  a.test.ts > d > une autre garde\nAssertionError: expected 1 to be 2\n"
       "      Tests  1 failed | 4 passed (5)\n", "garde visée par la cible", "SANS-TITRE"),
    ("délai dépassé (jamais une morsure)", _V
     + "   × d > t 5001ms\n FAIL  a.test.ts > d > t\nError: Test timed out in 5000ms.\n      Tests  1 failed | 7 passed (8)\n",
     "t", "PAS-ASSERTION"),
    ("plafond de console (Error de test-setup, pas une assertion)", _V
     + "   × d > t 30ms\n FAIL  a.test.ts > d > t\nError: 3 avertissement(s) de console dans un fichier NON exempté.\n"
       "      Tests  1 failed | 3 passed (4)\n", "t", "PAS-ASSERTION"),
    ("socle — aucun échec sous mutation", _V + "   ✓ d > t 3ms\n      Tests  4 passed (4)\n", "t", "VERT"),
]

_T1, _T2 = "titre un", "titre deux"
_X = lambda n, t, d="(1.0s)": f"  x  {n} [chromium] › specs\\a.e2e.ts:1:1 › {t} {d}\n"  # noqa: E731
_B = lambda n, t, corps: f"\n  {n}) [chromium] › specs\\a.e2e.ts:1:1 › {t} \n\n{corps}\n    attachment #1: screenshot\n"  # noqa: E731
_EXPECT = "    Error: message\n\n    Timed out 7000ms waiting for expect(locator).toHaveCount(expected)\n"
CALIBRATION_PLAYWRIGHT = [
    ("deux titres, deux assertions", _X(2, _T1) + _X(3, _T2) + _B(1, _T1, _EXPECT) + _B(2, _T2, _EXPECT) + "  2 failed\n",
     [_T1, _T2], "MORD"),
    ("deux titres attendus, un seul en « x »", _X(2, _T1) + "  ok 3 [chromium] › specs\\a.e2e.ts:2:1 › titre deux (1.0s)\n"
     + _B(1, _T1, _EXPECT) + "  1 failed\n", [_T1, _T2], "SANS-TITRE"),
    ("le SECOND bloc est un plantage, le premier une assertion (découpage des blocs)", _X(2, _T1) + _X(3, _T2)
     + _B(1, _T1, _EXPECT) + _B(2, _T2, "    Error: page.goto: net::ERR_CONNECTION_REFUSED\n") + "  2 failed\n",
     [_T1, _T2], "PAS-ASSERTION"),
    ("crochet en échec (0 ms)", _X(2, _T1, "(0ms)") + _B(1, _T1, "    Error: POST … a échoué\n") + "  1 failed\n",
     [_T1], "NON-DÉMARRÉE"),
    ("rien d'exécuté", "Error: Timed out waiting 180000ms from config.webServer.\n", [_T1], "NON-DÉMARRÉE"),
    ("aucun échec sous mutation", "  ok 2 [chromium] › specs\\a.e2e.ts:1:1 › titre un (1.0s)\n  1 passed\n", [_T1], "VERT"),
    ("socle — délai de TEST (pas une morsure, D323)", _X(2, _T1, "(30.0s)")
     + _B(1, _T1, "    Test timeout of 30000ms exceeded.\n\n    Error: page.click: Test timeout of 30000ms exceeded.\n")
     + "  1 failed\n", [_T1], "PAS-ASSERTION"),
    # Bras de la forme LINUX (« ✓ » / « ✘ ») — la ligne « ✓ » est recopiée de la passe e2e d'entrée de ce conteneur.
    ("socle — Linux : assertion lue sous « ✘ »", "  ✘  2 [chromium] › specs/a.e2e.ts:1:1 › titre un (1.0s)\n"
     + _B(1, _T1, _EXPECT) + "  1 failed\n", [_T1], "MORD"),
    ("socle — Linux : rien en échec sous « ✓ »",
     "  ✓  28 [chromium] › specs/b8-accessibility.e2e.ts:138:9 › B8 — accessibilité automatisée (D125) › titre un (4.5s)\n"
     "  1 passed\n", [_T1], "VERT"),
]


def calibrer() -> bool:
    manques = 0
    for nom, texte, titre, attendu in CALIBRATION_VITEST:
        verdict, _ = lire_vitest(texte, titre)
        manques += verdict != attendu
        print(f"  calibration vitest {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    decouverte = echecs_vitest(_V + " FAIL  a.test.ts > d > un\n FAIL  a.test.ts > d > deux\nAssertionError: m1\n\n"
                                    " FAIL  a.test.ts > d > trois\nTypeError: m2\n")
    attendu_d = [("FAIL  a.test.ts > d > un", "AssertionError: m1"), ("FAIL  a.test.ts > d > deux", "AssertionError: m1"),
                 ("FAIL  a.test.ts > d > trois", "TypeError: m2")]
    manques += decouverte != attendu_d
    print(f"  calibration vitest {'✓' if decouverte == attendu_d else '✗'} découverte : {len(decouverte)} échec(s) lu(s) (attendu 3)")
    for nom, texte, titres, attendu in CALIBRATION_PLAYWRIGHT:
        verdict, _ = lire_playwright(texte, titres)
        manques += verdict != attendu
        print(f"  calibration playwright {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    total = len(CALIBRATION_VITEST) + 1 + len(CALIBRATION_PLAYWRIGHT)
    print(f"  calibration : {total} bras · {manques} manqué(s) (attendu 0)")
    return manques == 0


# ══ LE MOTEUR DE CAMPAGNE ═══════════════════════════════════════════════════════════════════════════════════════════════
def _adapter(texte: str, source: str) -> str:
    """Ancres écrites en `\\n` ; un fichier en CRLF (poste de Ko, core.autocrlf) les porte en `\\r\\n` (D325)."""
    return texte.replace("\n", "\r\n") if "\r\n" in source else texte


class Campagne:
    """Une campagne : ses mesures, ses cibles, et `jouer(argv)` qui rend le code de sortie de la convention du dépôt —
    0 tout joué et tout mordu · 1 au moins une garde MUETTE · 2 pré-vol rouge, ERREUR DE SCRIPT, calibration manquée, arbre
    non conforme, mesure non démarrée · 3 campagne INCOMPLÈTE (cibles e2e hors exécution sans `--e2e`)."""

    def __init__(self, nom: str, mesures: dict[str, dict]):
        self.nom = nom
        self.mesures = mesures
        self.cibles: list[dict] = []
        self.sauvegarde = f".neutralisation-{nom}"
        self.manifeste = os.path.join(self.sauvegarde, "manifeste.json")
        self.journaux = os.path.join(".neutralisation-journaux", nom)
        self.decouverte = os.environ.get(f"{nom.upper().replace('-', '_')}_DECOUVERTE") == "1"

    # ── déclaration ──────────────────────────────────────────────────────────────────────────────────────────────────
    def cible(self, libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, object], genre: str | None = None) -> None:
        """`mesures` : {nom de mesure (suffixe `#n` admis) → titre attendu (vitest) ou liste de titres (playwright)}."""
        if genre is None:
            genre = "suppression" if apres == "" else ("insertion" if avant in apres else "substitution")
        if genre == "substitution" and apres in avant:
            raise ValueError(f"{libelle} : le remplacement est une SOUS-CHAÎNE de l'ancre — sa pose ne se prouve pas (D325)")
        for m in mesures:
            if m.split("#")[0] not in self.mesures:
                raise ValueError(f"{libelle} : mesure inconnue « {m} »")
        self.cibles.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures,
                            "genre": genre})

    # ── exécution ────────────────────────────────────────────────────────────────────────────────────────────────────
    def _lancer(self, mesure: str) -> tuple[int, str]:
        cmd = self.mesures[mesure]["cmd"]
        r = subprocess.run([binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
        return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or "")).replace("\r\n", "\n")

    def _lire(self, mesure: str, sortie: str, attendu) -> tuple[str, str]:
        if self.mesures[mesure]["genre"] == "vitest":
            return lire_vitest(sortie, attendu)
        return lire_playwright(sortie, None if attendu is None else list(attendu))

    def _ecrire_manifeste(self, actions: list) -> None:
        os.makedirs(self.sauvegarde, exist_ok=True)
        io.open(self.manifeste, "w", encoding="utf-8", newline="").write(json.dumps(actions, ensure_ascii=False))

    @staticmethod
    def _defaire(actions: list) -> None:
        for action in reversed(actions):
            io.open(action["chemin"], "w", encoding="utf-8", newline="").write(action["contenu"])

    def _restaurer_si_interrompu(self) -> None:
        if os.path.isfile(self.manifeste):
            actions = json.load(io.open(self.manifeste, encoding="utf-8"))
            self._defaire(actions)
            print(f"↺ arbre restauré après une exécution interrompue ({len(actions)} fichier(s)).")
        shutil.rmtree(self.sauvegarde, ignore_errors=True)

    def _empreintes(self) -> dict[str, str]:
        return {f: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in sorted({c["fichier"] for c in self.cibles})}

    def _verifier_arbre(self, moment: str, depart: dict[str, str] | None = None) -> bool:
        ecarts = []
        for c in self.cibles:
            src = io.open(c["fichier"], encoding="utf-8", newline="").read()
            n = src.count(_adapter(c["avant"], src))
            if n != 1:
                ecarts.append(f"{c['libelle'].split('.')[0]} : ancre ×{n}")
        if depart is not None:
            maintenant = self._empreintes()
            differents = [f for f in depart if depart[f] != maintenant[f]]
            ecarts += [f"{f} : empreinte changée" for f in differents]
            print(f"  empreintes : {len(depart)} fichier(s) ciblé(s) comparé(s) au départ · {len(differents)} différent(s) (attendu 0)")
        if ecarts:
            print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
            return False
        return True

    def jouer(self, argv: list[str]) -> int:
        modes = {"unit"} | ({"e2e"} if "--e2e" in argv else set())
        self._restaurer_si_interrompu()
        if not calibrer():
            print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
            return 2
        if not self._verifier_arbre("AU DÉPART"):
            return 2
        filtre = [p for p in os.environ.get(f"{self.nom.upper().replace('-', '_')}_FILTRE", "").split(",") if p]
        if filtre and not self.decouverte:
            print("✗ un FILTRE n'est admis qu'en DÉCOUVERTE : une campagne filtrée n'est pas une campagne verte.")
            return 2
        sans_titre = [c["libelle"].split(".")[0] for c in self.cibles for t in c["mesures"].values() if t == A_DECOUVRIR]
        if sans_titre and not self.decouverte:
            print(f"✗ TITRE NON RELEVÉ ({', '.join(sorted(set(sans_titre)))}) : relever en DÉCOUVERTE — aucun verdict sur « ? ».")
            return 2

        def mode_de(c: dict) -> str:
            return "e2e" if any(self.mesures[m.split("#")[0]]["mode"] == "e2e" for m in c["mesures"]) else "unit"

        jouees = [c for c in self.cibles if mode_de(c) in modes and (not filtre or any(c["libelle"].startswith(p) for p in filtre))]
        horsjeu = [c for c in self.cibles if mode_de(c) not in modes]
        depart = self._empreintes()
        os.makedirs(self.journaux, exist_ok=True)
        utilisees = sorted({m.split("#")[0] for c in jouees for m in c["mesures"]})
        print(f"cibles : {len(self.cibles)} déclarées · {len(jouees)} jouées ({', '.join(sorted(modes))}) · {len(horsjeu)} hors "
              f"exécution · {len(utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in jouees})} fichier(s) muté(s)")

        if any(self.mesures[m]["genre"] == "playwright" for m in utilisees):
            r = subprocess.run([binaire("pnpm"), "--filter", "@zwadj/e2e", "exec", "playwright", "--version"],
                               capture_output=True, text=True, encoding="utf-8", errors="replace")
            if PLAYWRIGHT_ATTENDU not in (r.stdout or ""):
                print(f"✗ PLAYWRIGHT NON ATTENDU : « {(r.stdout or '').strip()} » ({PLAYWRIGHT_ATTENDU} attendu) — refus de juger.")
                return 2

        # ── PRÉ-VOL : chaque mesure, SANS mutation, doit être verte et avoir DÉMARRÉ.
        for mesure in utilisees:
            code, sortie = self._lancer(mesure)
            io.open(os.path.join(self.journaux, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(sortie)
            verdict, detail = self._lire(mesure, sortie, None)
            if code != 0 or verdict != "VERT":
                print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
                print(sortie[-3000:])
                return 2
            print(f"  pré-vol {mesure} : code 0 · {detail}")

        mordu, muettes, erreurs = 0, [], []
        for c in jouees:
            chemin = c["fichier"]
            source = io.open(chemin, encoding="utf-8", newline="").read()
            avant, apres = _adapter(c["avant"], source), _adapter(c["apres"], source)
            ancre_avant, marque_avant = source.count(avant), (source.count(apres) if apres else 0)
            if ancre_avant != 1:
                print(f"✗ {c['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {chemin}")
                erreurs.append(c["libelle"])
                break
            mute = source.replace(avant, apres)
            ancre_apres = mute.count(avant)
            if c["genre"] == "suppression":
                ok, posee = ancre_apres == 0, f"ancre 1→{ancre_apres} · genre suppression (marqueur sans objet)"
            else:
                marque_apres = mute.count(apres)
                ancre_attendue = 1 if c["genre"] == "insertion" else 0
                ok = (ancre_apres, marque_apres) == (ancre_attendue, marque_avant + 1)
                posee = f"ancre 1→{ancre_apres} · marqueur {marque_avant}→{marque_apres} · genre {c['genre']}"
            if not ok:
                print(f"✗ {c['libelle']}\n   MUTATION NON POSÉE : {posee}")
                erreurs.append(c["libelle"])
                break
            annuler = [{"chemin": chemin, "contenu": source}]
            self._ecrire_manifeste(annuler)
            io.open(chemin, "w", encoding="utf-8", newline="").write(mute)
            sorties: dict[str, tuple[int, str]] = {}
            try:
                for mesure in sorted({m.split("#")[0] for m in c["mesures"]}):
                    sorties[mesure] = self._lancer(mesure)
            finally:
                self._defaire(annuler)
                shutil.rmtree(self.sauvegarde, ignore_errors=True)
            ident = c["libelle"].split(".")[0]
            for mesure, (code, sortie) in sorties.items():
                io.open(os.path.join(self.journaux, f"{ident}-{mesure}.log"), "w", encoding="utf-8").write(sortie)
            if self.decouverte:
                print(f"■ {c['libelle']}\n   {posee}")
                for mesure, (code, sortie) in sorties.items():
                    verdict, detail = self._lire(mesure, sortie, None)
                    print(f"   [{mesure}] code {code} · {verdict} — {detail}")
                    if self.mesures[mesure]["genre"] == "vitest":
                        for titre, message in echecs_vitest(sortie):
                            print(f"      {titre[:200]}\n         ↳ {message[:150]}")
                    else:
                        for tete, bloc in blocs_playwright(sortie).items():
                            print(f"      {tete[:200]}\n         ↳ {next((l.strip() for l in bloc.splitlines() if l.strip()), '—')[:150]}")
                continue
            verdicts = []
            for cle, attendu in c["mesures"].items():
                mesure = cle.split("#")[0]
                code, sortie = sorties[mesure]
                verdict, detail = self._lire(mesure, sortie, attendu)
                verdicts.append((cle, code, verdict, detail))
            if any(v in ("NON-DÉMARRÉE", "VERSION") for _, _, v, _ in verdicts):
                for cle, code, verdict, detail in verdicts:
                    print(f"✗ {c['libelle']}\n   [{cle}] MESURE NON DÉMARRÉE ({verdict}) : {detail}")
                erreurs.append(c["libelle"])
                break
            if all(v == "MORD" and code != 0 for _, code, v, _ in verdicts):
                mordu += 1
                print(f"✓ {c['libelle']}\n   {posee}")
                for cle, code, verdict, detail in verdicts:
                    print(f"   [{cle}] code {code} · {detail}")
            else:
                muettes.append(c["libelle"])
                print(f"✗ {c['libelle']}\n   {posee}")
                for cle, code, verdict, detail in verdicts:
                    print(f"   [{cle}] code {code} · {verdict} — {detail}")

        for c in horsjeu:
            print(f"  NON MESURÉE : {c['libelle']} — cible e2e, relancer avec --e2e")
        conforme = self._verifier_arbre("À L'ARRIVÉE", depart)
        if self.decouverte:
            print(f"\nDÉCOUVERTE : {len(jouees)} cible(s) jouée(s) sur {len(self.cibles)}, aucun verdict écrit.")
        else:
            print(f"\n{mordu} garde(s) mordue(s) sur {len(jouees)} cible(s) jouée(s) · {len(muettes)} muette(s) · {len(erreurs)} "
                  f"non mesurée(s) · {len(horsjeu)} hors exécution (attendu : {len(jouees)} sur {len(jouees)}, 0, 0)")
        if conforme:
            print("arbre rendu à son état de départ : vérifié.")
        if erreurs or not conforme:
            return 2
        if muettes:
            return 1
        return 3 if horsjeu else 0


if __name__ == "__main__":
    exiger_racine(__file__)
    sys.exit(0 if calibrer() else 2)
