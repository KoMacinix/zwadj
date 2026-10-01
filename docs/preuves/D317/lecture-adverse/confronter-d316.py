"""D317 — LECTURE ADVERSE DE D316 : ses chiffres confrontés à SES pièces, au code à `a65d40d` et au dépôt. Pièce jetable,
versée. N'écrit rien dans le dépôt : elle imprime ; les rejeux d'extraits s'écrivent dans un dossier HORS dépôt, nommé en
troisième argument. Patron : `docs/preuves/D316/lecture-adverse/confronter-d315.py` (non importé). Chaque contrôle imprime
l'attendu À CÔTÉ du mesuré (D290) et, quand il compte, ce qu'il a parcouru. Les attendus sont ceux qu'ÉCRIVENT la section
D316, le point d'entrée du rang 25, la ligne D316 de l'ordre, les reports de D316 au backlog et le commit `a65d40d` —
recopiés de ces textes pour être confrontés, jamais de mémoire. Un constat sans chiffre écrit par D316 s'imprime « · », il
n'entre pas au compte des écarts.
Les outils de D316 sont REJOUÉS sur l'état qu'ils ont lu : `confronter-d315.py` (worktree à ffd32e9, premier argument) ;
`balayage.py` dans un worktree détaché à a7c09fa dont les quatre fichiers d'autorité sont ceux de a65d40d — le HEAD et
l'arbre de son dernier passage (deuxième argument) ; `extraire.py` sur chaque journal brut encore sur disque (hors dépôt) ;
les deux contrôles « 0 valeur réelle » de D299 et D315 sur TOUT ce que a65d40d a fait partir.
⚠ Les journaux bruts ne sont JAMAIS recopiés : l'instrument n'imprime que des comptes, des empreintes et des horodatages.
Usage, depuis la racine :
  python docs/preuves/D317/lecture-adverse/confronter-d316.py <worktree à ffd32e9> <worktree balayage> <dossier hors dépôt>
"""
import datetime
import glob
import hashlib
import json
import os
import re
import struct
import subprocess
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml") or len(sys.argv) < 4:
    print("✗ À LANCER DEPUIS LA RACINE, avec <worktree à ffd32e9> <worktree balayage> <dossier hors dépôt>.")
    sys.exit(2)
WT_FFD, WT_BAL, HORS = sys.argv[1], sys.argv[2], sys.argv[3]
RACINE = os.getcwd()
if os.path.abspath(HORS).lower().startswith(os.path.abspath(RACINE).lower()):
    print("✗ Le dossier des rejeux doit être HORS du dépôt.")
    sys.exit(2)
os.makedirs(HORS, exist_ok=True)
D = "docs/preuves/D316"
DEPART, FIN = "a7c09fa", "a65d40d"
AUTORITE = ["CLAUDE.md", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
J = ".neutralisation-journaux"
ecarts, controles = 0, 0


def controle(nom: str, mesure, attendu, source: str = "section D316") -> None:
    global ecarts, controles
    controles += 1
    ok = mesure == attendu
    ecarts += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {nom} : mesuré {mesure!r} (attendu, {source} : {attendu!r})")


def calibration(nom: str, mesure, attendu, source: str) -> None:
    # D286 : un cas connu qui manque son verdict ARRÊTE l'instrument — il ne compte pas un écart de plus.
    controle(nom, mesure, attendu, source)
    if mesure != attendu:
        print("✗ ABANDON : calibration manquée")
        sys.exit(2)


def constat(texte: str) -> None:
    print(f"  · {texte}")


def git(*args: str, cwd: str = RACINE) -> str:
    return subprocess.run(["git", *args], capture_output=True, encoding="utf-8", cwd=cwd).stdout


def montreb(sha: str, chemin: str) -> bytes:
    return subprocess.run(["git", "show", f"{sha}:{chemin}"], capture_output=True).stdout


def montre(sha: str, chemin: str) -> str:
    return montreb(sha, chemin).decode("utf-8")


def sha256(octets: bytes) -> str:
    return hashlib.sha256(octets).hexdigest()


def plat(t: str) -> str:
    return re.sub(r"\s+", " ", t)


def norm(o: bytes) -> bytes:
    return o.replace(b"\r\n", b"\n")


def lire(chemin: str) -> str:
    return open(chemin, encoding="utf-8").read()


def sans_ansi(t: str) -> str:
    # ⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298) : la première passe gardait les « \r » des journaux bruts ; `$` en mode
    # multiligne ne s'arrête pas avant un « \r », et la ligne « x … (0ms) » de R25-E2 était introuvable (faux ✗).
    return re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", t).replace("\r\n", "\n").replace("\r", "\n")


def sans_commentaires(ts: str) -> str:
    # ⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298) : la première passe cherchait les liens et `passthrough` dans les COMMENTAIRES
    # — `routes.ts` cite `href="/auth/connexion"` en prose, le panneau cite `/connexion` pour dire ce qu'il visait, le
    # contrôleur écrit « SANS `passthrough` » (trois faux ✗). Un lien est du code : on retire les commentaires d'abord.
    ts = re.sub(r"/\*[\s\S]*?\*/", "", ts)
    return re.sub(r"(?<![:\"'`\w])//[^\n]*", "", ts)


CAL = "// cite href=\"/auth/connexion\" et `/connexion`\n/* `passthrough` */\nconst u = \"https://h/x\"; <a href=\"/auth/connexion\">"
CAL_OK = (sans_commentaires(CAL).count('href="/auth/connexion"'), "`/connexion`" in sans_commentaires(CAL),
          "passthrough" in sans_commentaires(CAL), "https://h/x" in sans_commentaires(CAL),
          bool(re.search(r"^\s+x\s+\d+ \[c\] .*\(0ms\)$", sans_ansi("  x  2 [c] › a (0ms)\r\nsuite\r\n"), re.M)),
          bool(re.search(r"^\s+x\s+\d+ \[c\] .*\(0ms\)$", sans_ansi("  x  2 [c] › a (3.1s)\r\n"), re.M)))


def g(motif: str) -> list[str]:
    # ⚠ Sous Windows, `glob` rend des barres INVERSES après le premier composant : un nom de destination dérivé par
    # `replace("/", …)` garderait alors des sous-dossiers inexistants. Tout chemin de glob passe par ici.
    return sorted(p.replace("\\", "/") for p in glob.glob(motif, recursive=True))


def rejouer(cmd: list[str], cwd: str) -> tuple[int, bytes]:
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, env=env)
    return r.returncode, r.stdout


# ------------------------------------------------------------------ 0. état de départ
print("== 0. état de départ")
calibration("calibration : commentaires retirés (lien en prose, `/connexion` cité, `passthrough` en bloc) · code gardé (lien, URL) · "
         "« x … (0ms) » trouvé malgré « \\r » · « x … (3.1s) » non pris pour 0 ms", CAL_OK, (1, False, False, True, True, False),
         "cas construits, deux bras (D286)")
# Rejouable à un HEAD ultérieur (comme l'outil de D316 l'a été) : ce qui se lit dans l'ARBRE — les pièces de D316 et les
# quelques pièces et outils d'autres décisions — doit être, octet pour octet aux fins de ligne près, ce que porte a65d40d ;
# tout le reste se lit dans les objets git (`git show a65d40d:…`), ou dans les journaux bruts hors dépôt.
LUS = [f for f in git("ls-tree", "-r", "--name-only", FIN, D).splitlines()] + [
    "docs/preuves/D315/captures/images/05-client-fr-connexion.jpg", "docs/preuves/D315/captures/images/17-client-ar-connexion.jpg",
    "docs/preuves/D314/passe-r23d-20260926-1434/test.log", "docs/preuves/D299/outils/aucune-valeur-reelle.py",
    "docs/preuves/D299/outils/alertes-nouvelles.py", "docs/preuves/D315/controles/aucun-cookie-reel.py"]
differe = [f for f in LUS if not os.path.isfile(f) or norm(open(f, "rb").read()) != norm(montreb(FIN, f))]
controle("fichiers lus dans l'arbre, différents de a65d40d", differe, [], "lecture de l'état commité par D316")
constat(f"parcouru : {len(LUS)} fichiers lus dans l'arbre · HEAD courant {git('rev-parse', '--short=7', 'HEAD').strip()}")

# ------------------------------------------------------------------ 1. provenance et périmètre
print("== 1. provenance et périmètre")
controle("parent du commit de D316", git("rev-parse", "--short=7", f"{FIN}^").strip(), DEPART, "« SHA de départ : a7c09fa »")
n = len(re.findall("D316", subprocess.run(["git", "grep", "-h", "D316", DEPART], capture_output=True).stdout.decode("utf-8")))
controle("« D316 » dans les fichiers suivis à a7c09fa", n, 0, "« 0 occurrence … à a7c09fa »")
TABLE = sorted([
    "e2e/specs/r25-demande-reservation.e2e.ts", "e2e/specs/r25-lien-connexion.e2e.ts", "e2e/specs/r25-suppression-compte.e2e.ts",
    "e2e/fixtures/harness.ts", "apps/client/src/lib/availability-windows.ts", "apps/client/src/lib/availability-windows.test.ts",
    "apps/client/src/components/venue/booking-request-panel.tsx",
    "apps/client/src/components/venue/booking-request-panel.test.tsx", "apps/client/src/lib/routes.ts",
    "apps/client/src/lib/routes.test.ts", "packages/i18n/messages/fr.json", "packages/i18n/messages/ar.json",
    "apps/api/src/account/account.controller.ts", "apps/api/test/int/account.int-spec.ts",
    "packages/api-client/src/account-client.ts", "packages/api-client/src/account-client.test.ts", "ZWADJ_CONTINUITE.md",
    "ZWADJ_BACKLOG.md", "AGENTS.md", "neutralisation/neutralize-r25.py"])
changes = [l for l in git("diff", "--name-only", DEPART, FIN).splitlines() if l]
controle("fichiers au diff hors de la table des fichiers attendus et de docs/preuves/D316/",
         [f for f in changes if f not in TABLE and not f.startswith(D + "/")], [], "table « Fichiers attendus » du rang 25")
controle("fichiers de la table absents du diff", [f for f in TABLE if f not in changes], [], "table « Fichiers attendus »")
preuves = [f for f in changes if f.startswith(D + "/")]
constat(f"parcouru : {len(changes)} fichiers au diff, dont {len(preuves)} sous {D}/ et {len(TABLE)} de la table")
controle("pièces d'autres décisions touchées", [f for f in changes if f.startswith("docs/preuves/") and not f.startswith(D + "/")],
         [], "aucune rectification annoncée par D316")
controle("commit de D316 sur origin/main", "origin/main" in git("branch", "-r", "--contains", FIN), True, "clôture poussée")

# ------------------------------------------------------------------ 2. rejeux à l'octet
print("== 2. les outils de D316 rejoués sur l'état qu'ils ont lu, sorties comparées à l'octet")
controle("worktree du premier argument", git("rev-parse", "--short=7", "HEAD", cwd=WT_FFD).strip(), "ffd32e9", "worktree détaché")
controle("worktree du balayage : HEAD", git("rev-parse", "--short=7", "HEAD", cwd=WT_BAL).strip(), DEPART,
         "HEAD du dernier passage du balayage (a7c09fa)")
egaux = [f for f in AUTORITE if norm(open(os.path.join(WT_BAL, f), "rb").read()) == norm(montreb(FIN, f))]
controle("worktree du balayage : fichiers d'autorité égaux à ceux de a65d40d (fins de ligne normalisées)", len(egaux), 4,
         "arbre du dernier passage = état qui part")
code, sortie = rejouer([sys.executable, f"{D}/lecture-adverse/confronter-d315.py", WT_FFD], RACINE)
verse = open(f"{D}/lecture-adverse/confronter-d315-sortie.txt", "rb").read()
controle("rejeu de confronter-d315.py = confronter-d315-sortie.txt", (norm(sortie) == norm(verse), len(sortie) > 0), (True, True),
         "sortie versée")
fin_verse = re.search(r"^(\d+) contrôles · (\d+) écart", norm(verse).decode("utf-8"), re.M)
controle("confronter-d315-sortie.txt : contrôles · écarts", fin_verse.groups() if fin_verse else None, ("67", "0"),
         "« 67 contrôles, 0 écart »")
code, sortie = rejouer([sys.executable, os.path.join(RACINE, D, "passe-d277", "balayage.py")], WT_BAL)
controle("rejeu de balayage.py (HEAD a7c09fa, arbre a65d40d) = balayage-controle.txt",
         (norm(sortie) == norm(open(f"{D}/passe-d277/balayage-controle.txt", "rb").read()), code), (True, 0),
         "« balayage-controle.txt, rejoué sur l'état qui part »")
extraits = g(f"{D}/**/*-extrait.txt")
differents, absents, sorties_non_nulles, par_copie = [], [], [], []
# ⚠ Le rejeu de `neutralize-r25.py --e2e` par D317 écrase `.neutralisation-journaux/r25/R25-N.log`. Les journaux de D316 y
# ont été copiés AVANT, octet pour octet (`.neutralisation-journaux/d316/r25-copie-avant-d317/`). Un journal dont l'empreinte
# ne répond plus se cherche donc dans cette copie, PAR SON EMPREINTE, jamais par son seul nom ; l'extrait rejoué depuis la
# copie ne diffère alors que par le chemin écrit dans son en-tête, qu'on remplace UNE fois avant de comparer à l'octet — sans
# jamais écrire dans un journal.
COPIE = f"{J}/d316/r25-copie-avant-d317"
for e in extraits:
    tete = open(e, encoding="utf-8").readline()
    m = re.match(r"^# extrait de (\S+) · sha256 du journal complet ([0-9a-f]{64}) ·", tete)
    source = m.group(1) if m else None
    if source and (not os.path.isfile(source) or sha256(open(source, "rb").read()) != m.group(2)):
        candidat = os.path.join(COPIE, os.path.basename(source))
        if os.path.isfile(candidat) and sha256(open(candidat, "rb").read()) == m.group(2):
            par_copie.append(e)
            source = ("copie", candidat)
        else:
            source = None
    if source is None:
        absents.append(e)
        continue
    dest = os.path.join(HORS, e.replace("/", "__"))
    if isinstance(source, tuple):
        c, _ = rejouer([sys.executable, f"{D}/outils/extraire.py", source[1], dest], RACINE)
        rejoue = open(dest, "rb").read().replace(source[1].replace("\\", "/").encode("utf-8"), m.group(1).encode("utf-8"), 1)
    else:
        c, _ = rejouer([sys.executable, f"{D}/outils/extraire.py", source, dest], RACINE)
        rejoue = open(dest, "rb").read()
    if c != 0:
        sorties_non_nulles.append(e)
    if rejoue != open(e, "rb").read():
        differents.append(e)
constat(f"parcouru : {len(extraits)} extraits versés · {len(par_copie)} rejoués depuis la copie de D317 (empreinte vérifiée)")
controle("extraits dont le journal brut manque sur disque", absents, [], "journaux de travail hors dépôt (D291)")
controle("extraits dont le rejeu d'extraire.py diffère à l'octet", differents, [], "chaque extrait se rattache à SON journal")
controle("rejeux d'extraire.py sortis non nuls (valeur sensible restée dans l'extrait)", sorties_non_nulles, [],
         "« attendu 0, obtenu 0 partout »")

# ------------------------------------------------------------------ 3. les portes
print("== 3. les portes")
P = f"{D}/portes"
tc = lire(f"{P}/typecheck-extrait.txt")
done = re.findall(r"^(\S+) typecheck: Done$", tc, re.M)
controle("typecheck : paquets « Done », e2e compris", (len(done), "e2e" in done), (8, True), "« 8 paquets « Done » (e2e compris) »")
controle("typecheck : « error TS »", tc.count("error TS"), 0, "« 0 error TS »")
li = lire(f"{P}/lint-extrait.txt")
controle("lint : paquets « Done » · lignes d'erreur ou d'avertissement",
         (len(re.findall(r"^\S+ lint: Done$", li, re.M)), len(re.findall(r"\b(error|warning)\b|✖", li))), (8, 0),
         "« 8 paquets « Done », aucune ligne d'erreur ni d'avertissement »")


def comptes_test(texte: str) -> dict:
    res, paquet = {}, None
    for l in texte.splitlines():
        m = re.match(r"^> @zwadj/([\w-]+)@\S+ test ", l)
        if m:
            paquet = m.group(1)
        m = re.match(r"^ Test Files\s+(\d+) passed \((\d+)\)$", l)
        if m and paquet:
            res.setdefault(paquet, {})["f"] = int(m.group(1))
        m = re.match(r"^\s+Tests\s+(\d+) passed \((\d+)\)$", l)
        if m and paquet:
            res.setdefault(paquet, {})["t"] = int(m.group(1))
    return {k: (v.get("t"), v.get("f")) for k, v in res.items()}


te = lire(f"{P}/test-extrait.txt")
c316 = comptes_test(te)
controle("test : paquet → (tests, fichiers)", c316, {"api": (664, 58), "api-client": (39, 4), "client": (308, 22), "pro": (347, 28)},
         "« API 664/58 · api-client 39/4 · client 308/22 · pro 347/28 »")
fails = [l for l in te.splitlines() if re.search("fail", l, re.I)]
controle("test : lignes « fail », toutes des journaux du test Chargily « injoignable »",
         (len(fails), all("ChargilyGateway" in l and "injoignable" in l for l in fails)), (2, True),
         "« les deux « fail » … un test Chargily qui simule un fournisseur injoignable »")
c314 = comptes_test(sans_ansi(lire("docs/preuves/D314/passe-r23d-20260926-1434/test.log")))
controle("test : écart à la marque de D314 (pièce de sa passe)",
         {k: (c316[k][0] - c314[k][0], c316[k][1] - c314[k][1]) for k in c316},
         {"api": (0, 0), "api-client": (3, 1), "client": (21, 2), "pro": (0, 0)}, "« (+3, +1) · (+21, +2) »")
bu = lire(f"{P}/build-extrait.txt")
controle("build : paquets « Done »", len(re.findall(r"^\S+ build: Done$", bu, re.M)), 4, "« 4 « Done » »")
ti = lire(f"{P}/test-int-extrait.txt")
controle("test:int : tests · fichiers · code · durée",
         (re.search(r"Tests\s+(\d+) passed", ti).group(1), re.search(r"Test Files\s+(\d+) passed", ti).group(1),
          re.search(r"^code=(\d+) durée=(\d+)s$", ti, re.M).groups()), ("444", "36", ("0", "306")), "« 444/444, 36 fichiers » · 0 · 306 s")
tw = lire(f"{P}/test-e2e-extrait.txt")
controle("e2e : réussis · ignorés · code · durée",
         (re.search(r"^\s+(\d+) passed \(", tw, re.M).group(1), re.search(r"^\s+(\d+) skipped$", tw, re.M).group(1),
          re.search(r"^code=(\d+) durée=(\d+)s$", tw, re.M).groups()), ("41", "1", ("0", "127")), "« 41 réussis, 1 ignoré » · 0 · 127 s")
r25 = re.findall(r"^\s+ok\s+\d+ \[chromium\] › specs\\r25-", tw, re.M)
b8 = re.findall(r"^\s+ok\s+\d+ \[chromium\] › specs\\b8-accessibility", tw, re.M)
controle("e2e : titres r25 réussis · B8 réussis (≥ 1) · titres en « x »",
         (len(r25), len(b8) >= 1, len(re.findall(r"^\s+x\s+\d+ \[", tw, re.M))), (7, True, 0), "« 34 + 7 neufs ; B8 comprise »")
porteurs = sorted(f for f in os.listdir(P) if re.search(r"^code=\d+ durée=\d+s$", lire(f"{P}/{f}"), re.M))
controle("portes dont la pièce porte le code et la durée", porteurs, sorted(os.listdir(P)),
         "table des portes : code et durée écrits pour les SIX (D291 : une mesure nomme sa pièce)")
bruts = [f for f in g(f"{J}/d316/portes/*.log") if re.search(r"durée=\d+s", open(f, encoding="utf-8", errors="replace").read())]
constat(f"journaux bruts des portes (hors dépôt) portant « durée= » : {sorted(os.path.basename(b) for b in bruts)} sur "
        f"{len(g(f'{J}/d316/portes/*.log'))} — les codes 0 de typecheck, lint et build s'INFÈRENT des « Done », celui de "
        "test des « passed » ; les durées 19, 12, 63 et 38 s n'ont aucune pièce")
etat = [f for f in g(f"{D}/**/*") if os.path.isfile(f) and f.endswith((".txt", ".py", ".ts"))
        and re.search(r"PERF\D{0,6}84[,.]4|6[  ]?380 Mo", open(f, encoding="utf-8", errors="replace").read())]
controle("pièce portant l'état machine au départ des portes (6 380 Mo, PERF 84,4)", bool(etat), True,
         "« État machine au départ des portes … (relevé …) » — D291 : une mesure nomme sa pièce")
controle("plafond act(…) du test du panneau (S8)",
         '"src/components/venue/booking-request-panel.test.tsx": 5' in montre(FIN, "apps/client/src/test-setup.ts"), True,
         "« reste à 5 avertissements act(…), son plafond (S8) »")

# ------------------------------------------------------------------ 4. la campagne du lot
print("== 4. la campagne neutralize-r25.py")
H = montre(FIN, "neutralisation/neutralize-r25.py")
mes = re.findall(r'"mesure": "([^"]+)"', H)
controle("CIBLES : total · unitaires · intégration · e2e",
         (len(mes), sum(m in ("fenetres", "panneau", "routes") for m in mes), sum(m.startswith("int-") for m in mes),
          sum(m.startswith("e2e-") for m in mes)), (11, 7, 1, 3), "« 11 cibles : 7 unitaires, 1 d'intégration, 3 e2e »")
controle("vitest exigé", re.search(r'VITEST_ATTENDU = "([^"]+)"', H).group(1), "v3.2.7", "« vitest 3.2.7 exigé »")


def verdicts(texte: str) -> dict:
    lignes = texte.splitlines()
    res = {}
    for i, l in enumerate(lignes):
        m = re.match(r"^([✓✗]) (R25-\w+)\. ", l)
        if m:
            res[m.group(2)] = (m.group(1), lignes[i + 1] if i + 1 < len(lignes) else "")
    return res


IDS = [f"R25-{i}" for i in range(1, 9)] + ["R25-E1", "R25-E2", "R25-E3"]
off = lire(f"{D}/neutralisation/campagne-r25-officielle-extrait.txt")
vo = verdicts(off)
controle("passe officielle : verdicts des 11 cibles", {k: v[0] for k, v in vo.items()}, {k: "✓" for k in IDS}, "« 11 mordues sur 11 »")
controle("passe officielle : mutations prouvées posées (ancre 1→0 · marqueur 0→1)",
         sum("ancre 1→0 · marqueur 0→1" in v[1] for v in vo.values()), 11, "« ancre 1 → 0, marqueur n → n + 1 »")
controle("passe officielle : cibles vitest lues en AssertionError, au moins un test en échec",
         sum("AssertionError" in vo[k][1] and bool(re.search(r"en échec [1-9]", vo[k][1])) for k in IDS[:8]), 8,
         "« une AssertionError en première ligne de son bloc »")
controle("passe officielle : cibles e2e avec au moins un titre en « x »",
         sum(bool(re.search(r"· x [1-9]", vo[k][1])) for k in IDS[8:]), 3, "« le titre en « x » »")
syn = re.search(r"^(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) jouée\(s\) · (\d+) non mesurée", off, re.M)
controle("passe officielle : synthèse · code · durée · calibration",
         (syn.groups(), re.search(r"^code=(\d+) durée=(\d+)s$", off, re.M).groups(),
          re.search(r"calibration : (\d+) bras · (\d+) manqué", off).groups()),
         (("11", "11", "0"), ("0", "691"), ("10", "0")), "« 11 sur 11, code 0, 691 s » · « calibration à 10 bras »")
p1 = lire(f"{D}/neutralisation/premiere-passe-officielle/campagne-extrait.txt")
v1 = verdicts(p1)
controle("première passe : synthèse · verdict de R25-E2",
         (re.search(r"^(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", p1, re.M).groups(), v1["R25-E2"][0]),
         (("10", "11"), "✗"), "« une première passe officielle a rendu 10 sur 11 »")
constat("première passe : " + " · ".join(re.search(r"^code=(\d+) durée=(\d+)s$", p1, re.M).groups()) + " (code · durée ; non écrits par la section)")
b2 = sans_ansi(open(f"{J}/d316/officielle-1/R25-E2.log", "rb").read().decode("utf-8", "replace"))
controle("R25-E2 de la première passe (brut, hors dépôt) : titres « x » à 0 ms · ECONNREFUSED · recompilations",
         (len(re.findall(r"^\s+x\s+\d+ \[chromium\] .*\(0ms\)$", b2, re.M)) >= 1, "ECONNREFUSED" in b2,
          re.findall(r"\[(\d\d:\d\d:\d\d) a\.m\.\] File change detected", b2)),
         (True, True, ["12:14:35", "12:14:37", "12:14:39"]), "« beforeAll … ECONNREFUSED … File change detected ×3 » ; « 00:14:35 »")
r1 = sans_ansi(open(f"{J}/d316/rouge-defaut1.log", "rb").read().decode("utf-8", "replace"))
fc = [m.start() for m in re.finditer("File change detected", r1)]
w = re.search(r"^\s+(ok|x)\s+\d+ \[warmup\]", r1, re.M)
controle("rouge du défaut 1 (brut) : recompilations · la première AVANT le préchauffage",
         (re.findall(r"\[(\d\d:\d\d:\d\d) p\.m\.\] File change detected", r1), bool(fc and w and fc[0] < w.start())),
         (["11:20:58"], True), "« vu deux fois : 23:20:58, avant le préchauffage »")
debuts = {}
for i in range(1, 9):
    t = lire(f"{D}/neutralisation/passe-officielle/R25-{i}-extrait.txt")
    m = re.search(r"Start at\s+(\d\d:\d\d:\d\d)", t)
    debuts[i] = m.group(1) if m else None
constat("heures de départ vitest des extraits versés sous passe-officielle/ : "
        + " · ".join(f"R25-{i} {debuts[i]}" for i in range(1, 9)))
controle("passe-officielle/ : extraits R25-1 à R25-7 lancés AVANT R25-8, dans l'ordre de la campagne (CIBLES)",
         [f"R25-{i}" for i in range(1, 8) if debuts[i] and debuts[8] and debuts[i] < debuts[8]],
         [f"R25-{i}" for i in range(1, 8)],
         "« Passe officielle … (docs/preuves/D316/neutralisation/) » ; D309, point 3 : une pièce cite SA passe")
mt = {os.path.basename(f): datetime.datetime.fromtimestamp(os.path.getmtime(f)).strftime("%H:%M:%S")
      for f in (f"{J}/d316/campagne-r25-officielle.log", f"{J}/d316/lancer-campagnes.log")}
constat(f"fin des journaux (mtime, hors dépôt) : campagne officielle {mt['campagne-r25-officielle.log']} · tri lancer-campagnes "
        f"{mt['lancer-campagnes.log']} — les départs de R25-1 à R25-7 tombent dans la fenêtre du TRI (mode par défaut, 7 cibles)")
lc = lire(f"{D}/neutralisation/lancer-campagnes-extrait.txt")
controle("tri : concernées · total · sortie · mordues · muettes · non mesurées",
         (re.search(r"→ (\d+) campagne\(s\) concernée\(s\) sur (\d+)", lc).groups(),
          re.search(r"sortie=(\d+)\s+(\d+) mordue\(s\), (\d+) muette\(s\)/erreur\(s\), (\d+) non mesurée", lc).groups()),
         (("1", "29"), ("3", "7", "0", "4")), "« 1 campagne concernée sur 29 … 7 mordues, 4 non mesurées … sortie 3 »")
harnais = [f for f in git("ls-tree", "--name-only", FIN, "neutralisation/").splitlines() if re.match(r"neutralisation/neutralize-.*\.py$", f)]
controle("harnais neutralize-*.py à a65d40d", len(harnais), 29, "« sur 29 »")
cles = ["availability-windows", "booking-request-panel", "lib/routes", "account.controller", "account.int-spec", "account-client",
        "r25-", "fixtures/harness", "fr.json", "ar.json", "messages/"]
autres = {h: [k for k in cles if k in montre(FIN, h)] for h in harnais if not h.endswith("neutralize-r25.py")}
controle("autres harnais citant un fichier du lot", {h: v for h, v in autres.items() if v}, {},
         "« aucune autre campagne ne mute ni ne mesure un fichier de ce lot »")
constat(f"parcouru : {len(autres)} harnais × {len(cles)} motifs")
constat("sections du dossier non citées par la section : campagne-r25-complete (11/11, avant les portes), campagne-r25-unit, "
        "forme-groupee — noms neutres, aucune ne se donne pour la passe comptée")

# ------------------------------------------------------------------ 5. les captures
print("== 5. les captures d'après correctif")
I = f"{D}/captures/images"
imgs = sorted(os.listdir(I))
tailles = {i: os.path.getsize(f"{I}/{i}") for i in imgs}
controle("images · octets", (len(imgs), sum(tailles.values())), (7, 2_430_716), "« 7 images … 2 430 716 octets »")
rel = lire(f"{D}/captures/releve.txt")
cap = re.findall(r"^CAPTURE (\S+) · .* · (\d+) octets$", rel, re.M)
controle("relevé : lignes CAPTURE, chaque taille = celle du fichier versé · FIN",
         (len(cap), all(tailles.get(n) == int(o) for n, o in cap), "FIN · 7 capture(s) tentée(s)" in rel), (7, True, True), "releve.txt")
d315 = sorted(os.listdir("docs/preuves/D315/captures/images"))
controle("images absentes de D315 (noms)", [i for i in imgs if i not in d315], ["25-client-ar-connexion-cible-du-bouton-reserver.jpg"],
         "« aux noms et numéros de D315 … 25-ar (neuve) »")


def dims(o: bytes):
    i = 2
    while i + 9 < len(o):
        if o[i] != 0xFF:
            i += 1
            continue
        mk = o[i + 1]
        if mk in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h, w_ = struct.unpack(">HH", o[i + 5:i + 9])
            return (w_, h)
        if mk == 0xD8 or mk == 0x01 or 0xD0 <= mk <= 0xD7 or mk == 0xFF:
            i += 2 if mk != 0xFF else 1
            continue
        i += 2 + struct.unpack(">H", o[i + 2:i + 4])[0]
    return None


larg = {i: dims(open(f"{I}/{i}", "rb").read()) for i in imgs}
calibration("calibration du lecteur JPEG : bras positif (largeur 1280 sur les 7) · bras négatif (octets tronqués)",
         (all(v and v[0] == 1280 for v in larg.values()), dims(open(f"{I}/{imgs[0]}", "rb").read()[:40])), (True, None),
         "fenêtre « Desktop Chrome » de la configuration e2e")
controle("dimensions des captures 04 et 26", (larg["04-client-fr-salle.jpg"], larg["26-client-fr-salle-connecte.jpg"]),
         ((1280, 14487), (1280, 14798)), "« 04 : 1280 × 14 487 ; 26 : 1280 × 14 798 » (backlog) ; « 14 487 px » (section)")
i315 = "docs/preuves/D315/captures/images"
controle("25-fr et 25-ar : octets identiques aux captures 05 et 17 de D315",
         (sha256(open(f"{I}/25-client-fr-connexion-cible-du-bouton-reserver.jpg", "rb").read())
          == sha256(open(f"{i315}/05-client-fr-connexion.jpg", "rb").read()),
          sha256(open(f"{I}/25-client-ar-connexion-cible-du-bouton-reserver.jpg", "rb").read())
          == sha256(open(f"{i315}/17-client-ar-connexion.jpg", "rb").read())),
         (True, True), "« 58 018 et 51 351 octets — exactement les captures 05 et 17 de D315 »")
m4 = json.loads(re.search(r"^M4 · .* : (\[.*\])$", rel, re.M).group(1))
fen = [re.match(r"^(\d+) \?from=(\S+)&to=(\S+)$", r).groups() for r in m4]
larges = [(datetime.date.fromisoformat(b) - datetime.date.fromisoformat(a)).days + 1 for _, a, b in fen]
controle("M4 : les deux fenêtres du panneau (statut, bornes) et leurs largeurs bornes incluses",
         ([(s, a, b) for s, a, b in fen if (s, a, b) != ("200", "2026-09-01", "2026-09-30")], larges[1:]),
         ([("200", "2026-09-28", "2026-12-28"), ("200", "2026-12-29", "2027-03-28")], [92, 90]),
         "« deux requêtes … 200 toutes deux » ; « deux fenêtres (92 + 90) »")
m1 = json.loads(re.search(r"^M1 · .* : (\[.*\])$", rel, re.M).group(1))
controle("M1 : liens « connexion » de la fiche", sorted({l["href"] for l in m1}), ["/fr/auth/connexion"],
         "« les deux liens … visent /fr/auth/connexion »")
m2 = re.findall(r"^M2 · (fr|ar) · .* URL (\S+) · statut à froid (\d+)$", rel, re.M)
controle("M2 : FR et AR", m2, [("fr", "http://localhost:3100/fr/auth/connexion", "200"),
                               ("ar", "http://localhost:3100/ar/auth/connexion", "200")], "« /fr/auth/connexion et /ar/auth/connexion, 200 à froid »")

# ------------------------------------------------------------------ 6. le code, à a65d40d
print("== 6. le code à a65d40d")
PAN = "apps/client/src/components/venue/booking-request-panel.tsx"
dl = [l for l in git("diff", "-U0", DEPART, FIN, "--", PAN).splitlines() if l[:1] in "+-" and not l.startswith(("+++", "---"))]
interdits = [l for l in dl if re.search(r"previewDeposit|lineTotal|setChosen|submit|deposit|acompte|total", l, re.I)]
controle("panneau : lignes ajoutées ou retirées qui touchent l'aperçu d'acompte ou le transport de la date", interdits, [],
         "« le git diff du panneau ne touche aucune ligne de previewDeposit, lineTotal, du total, de l'acompte, de setChosen ni de submit »")
constat(f"parcouru : {len(dl)} lignes ajoutées ou retirées du panneau")
pan = montre(FIN, PAN)
controle("panneau : WINDOW_DAYS", re.search(r"^export const WINDOW_DAYS = (\d+);$", pan, re.M).group(1), "182", "« 182 jours gardés »")
aw = montre(FIN, "apps/client/src/lib/availability-windows.ts")
controle("availability-windows.ts : borne IMPORTÉE du contrat",
         bool(re.search(r"import\s*\{[^}]*AVAILABILITY_MAX_WINDOW_DAYS[^}]*\}\s*from\s*\"@zwadj/types\"", aw)), True, "« borne IMPORTÉE »")
rt = montre(FIN, "apps/client/src/lib/routes.ts")
controle("routes.ts : LOGIN_PATH", re.search(r'LOGIN_PATH\s*=\s*"([^"]+)"', rt).group(1), "/auth/connexion", "« LOGIN_PATH »")
rtt = montre(FIN, "apps/client/src/lib/routes.test.ts")
controle("routes.test.ts : la garde lit un FICHIER page.tsx", ("page.tsx" in rtt, bool(re.search(r"existsSync|statSync|readdirSync", rtt))),
         (True, True), "« gardé contre le fichier de la page (D249) »")
src_client = [f for f in git("ls-tree", "-r", "--name-only", FIN, "apps/client/src").splitlines()
              if f.endswith((".ts", ".tsx")) and not re.search(r"\.(test|spec)\.tsx?$", f)]
litt = {}
for f in src_client:
    k = sans_commentaires(montre(FIN, f)).count('href="/auth/connexion"')
    if k:
        litt[os.path.basename(f)] = k
controle("client : liens littéraux href=\"/auth/connexion\" par fichier (hors tests)", litt,
         {"account-settings-view.tsx": 1, "auth-ui.tsx": 1, "recovery-forms.tsx": 3, "register-form.tsx": 1, "verify-email-view.tsx": 1,
          "site-chrome.tsx": 1, "visit-booking-panel.tsx": 1}, "backlog, « neuf liens … recovery-forms.tsx (×3) »")
pro_url = sum(montre(FIN, f).count("${PRO_URL}/auth/connexion") for f in src_client)
controle("client : liens vers la SPA pro (${PRO_URL}/auth/connexion)", pro_url, 2, "« plus deux liens vers la SPA pro »")
src_pro = [f for f in git("ls-tree", "-r", "--name-only", FIN, "apps/pro/src").splitlines()
           if f.endswith((".ts", ".tsx")) and not re.search(r"\.(test|spec)\.tsx?$", f)]
nus = [(os.path.basename(f), m.group(0)) for f in src_client + src_pro
       for m in re.finditer(r"[\"'`]/(?:fr/|ar/)?connexion[\"'`]", sans_commentaires(montre(FIN, f)))]
controle("client et pro : un lien vers /connexion sans /auth (hors tests)", nus, [], "« Aucun autre lien vers /connexion »")
constat(f"parcouru : {len(src_client)} fichiers client, {len(src_pro)} fichiers pro")
ac = sans_commentaires(montre(FIN, "apps/api/src/account/account.controller.ts"))
# ⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298) : la première passe cherchait la chaîne « .status(200).json( » ; le code écrit
# `HttpStatus.OK`, qui VAUT 200. Un statut se compare par sa valeur, pas par sa graphie.
# ⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298), seconde passe : le contrôle portait sur TOUT le fichier ; un autre handler y
# déclare `@Res({ passthrough: true })`, légitimement. D316 parle du seul handler `GET deletion-request`.
bloc = ac[ac.index('@Get("deletion-request")'):ac.index('@Post("deletion-request")')]
controle("account.controller.ts, handler GET deletion-request, code hors commentaires : @Res() · "
         "res.status(200 ou HttpStatus.OK).json( · passthrough",
         ("@Res()" in bloc, bool(re.search(r"res\.status\((?:200|HttpStatus\.OK)\)\.json\(", bloc)), "passthrough" in bloc),
         (True, True, False), "« res.status(200).json(…) (@Res() sans passthrough) »")
constat(f"dans le reste du fichier, « passthrough: true » : {ac.count('passthrough: true')} — un autre handler, non visé par D316")
constat("D316 écrit « res.status(200).json(…) » ; le code porte « res.status(HttpStatus.OK).json(…) » — même statut, autre graphie")
api_src = [f for f in git("ls-tree", "-r", "--name-only", FIN, "apps/api/src").splitlines() if f.endswith(".ts") and "/generated/" not in f]
glob_int = sum(len(re.findall(r"useGlobalInterceptors|APP_INTERCEPTOR", montre(FIN, f))) for f in api_src)
controle("API : intercepteurs globaux", glob_int, 0, "« aucun intercepteur global, relevé »")
constat(f"parcouru : {len(api_src)} fichiers de apps/api/src (hors generated) ; useGlobalFilters : "
        f"{sum(montre(FIN, f).count('useGlobalFilters') for f in api_src)}")
arbre_fin = git("ls-tree", "-r", "--name-only", FIN, "packages/api-client/src")
arbre_dep = git("ls-tree", "-r", "--name-only", DEPART, "packages/api-client/src")
controle("account-client.test.ts : absent à a7c09fa, présent à a65d40d",
         ("account-client.test.ts" in arbre_dep, "account-client.test.ts" in arbre_fin), (False, True), "« account-client.test.ts (neuf) »")
cle = {}
for lang in ("fr", "ar"):
    for sha in (DEPART, FIN):
        cle[(lang, sha)] = "loadFailed" in json.loads(montre(sha, f"packages/i18n/messages/{lang}.json"))["venueDetail"]["booking"]
controle("i18n : venueDetail.booking.loadFailed (fr, ar) à a7c09fa puis a65d40d", cle,
         {("fr", DEPART): False, ("fr", FIN): True, ("ar", DEPART): False, ("ar", FIN): True}, "« loadFailed (FR et AR) »")

# ------------------------------------------------------------------ 7. audit de secrets et « 0 valeur réelle »
print("== 7. audit de secrets et contrôles « 0 valeur réelle »")
for nm, al in (("audit-secrets-d316.txt", 135), ("audit-secrets-final.txt", 136)):
    o = open(f"{D}/{nm}", "rb").read()
    corps, _, der = o.rstrip(b"\n").rpartition(b"\n")
    m = re.search(rb"SCEAU sha256:([0-9a-f]{64})", der)
    controle(f"{nm} : le sceau couvre les octets qui le précèdent", bool(m) and m.group(1).decode() == sha256(corps + b"\n"), True,
             "sortie scellée (D298)")
    a = re.search(rb"alertes : (\d+) \(attendu 0\)", o)
    controle(f"{nm} : alertes", int(a.group(1)) if a else None, al, "« 135 alertes » ; commit a65d40d : « audit 135 puis 136 »")
tri = lire(f"{D}/controles/tri-audit-d316.txt")
controle("tri de l'audit : neuves · ventilation", (re.search(r"ABSENTES de la précédente : (\d+)", tri).group(1),
                                                   re.search(r"ventilation par motif : (.*)$", tri, re.M).group(1).strip()),
         ("8", "mot-de-passe=6 · jeton=2"), "« 8 neuves … une propriété, cinq récitations …, deux expressions de mon extracteur »")
code, s = rejouer([sys.executable, "docs/preuves/D299/outils/alertes-nouvelles.py", f"{D}/audit-secrets-d316.txt",
                   f"{D}/audit-secrets-final.txt"], RACINE)
s = s.decode("utf-8")
n_neuves = re.search(r"ABSENTES de la précédente : (\d+)", s)
constat(f"audit final contre audit-d316 (D299, rejoué) : {n_neuves.group(1) if n_neuves else '?'} neuve(s) — "
        + " | ".join(l.strip()[:110] for l in s.splitlines() if l.strip().startswith("[")))
# ⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298) : la première passe prenait toute mention de « audit-secrets-final.txt » — dont
# celle de l'audit final de D315, « précédente » du tri de D316. Un tri de l'audit final de D316 le nomme « nouvelle ».
tri_final = [f for f in g(f"{D}/**/*") if os.path.isfile(f) and f.endswith(".txt")
             and "nouvelle docs/preuves/D316/audit-secrets-final.txt" in open(f, encoding="utf-8", errors="replace").read()]
constat(f"pièce de tri de l'audit FINAL : {tri_final or 'aucune'} — l'alerte neuve se lit à sa ligne de l'audit final : le "
        "fichier de tri qui récite un titre de test (« valeur trop courte pour une recherche ») ; un mot")
for nm, attendu in (("aucune-valeur-reelle.txt", ("74", "13", "85", "0")), ("aucun-cookie-reel.txt", ("145", "13", "85", "0"))):
    t = lire(f"{D}/controles/{nm}")
    m = re.search(r"valeurs cherchées : (\d+) \((\d+) journal/journaux\) · parcourus : (\d+) fichiers, \d+ octets · porteurs : (\d+)", t)
    controle(f"{nm} : valeurs · journaux · fichiers · porteurs", m.groups() if m else None, attendu,
             "« 74 valeurs … 13 journaux ; cookie — 145 … ; 85 fichiers parcourus, 0 porteur »")
ch = lire(f"{D}/controles/controle-forme-chargily-sortie.txt")
controle("forme Chargily : fichiers · porteurs", re.search(r"parcourus : (\d+) fichiers, \d+ octets · porteurs : (\d+)", ch).groups(),
         ("87", "0"), "« 87 fichiers, 0 porteur »")
jeton = re.compile(r"[?&]token=[A-Za-z0-9_\-.]{16,}")
cookie = re.compile(r"zwadj_rt=[^;\s\"']{8,}")
# Les journaux de D316 : `d316/` (hors la copie) et, pour `r25/`, la COPIE faite avant le rejeu de D317 (même empreinte).
def version_d316(chemin: str) -> str:
    c = chemin.replace("\\", "/")
    if c.startswith(f"{J}/r25/") and os.path.isfile(os.path.join(COPIE, os.path.basename(c))):
        return os.path.join(COPIE, os.path.basename(c))
    return chemin


tous = sorted([f for f in g(f"{J}/d316/**/*.log") if not f.startswith(COPIE)] + [f"{J}/r25/{os.path.basename(f)}" for f in g(f"{COPIE}/*.log")])
avec = sorted(os.path.normpath(f) for f in tous
              if jeton.search(t_ := open(version_d316(f), "rb").read().decode("utf-8", "replace")) or cookie.search(t_))
treize = sorted(os.path.normpath(re.match(r"^✓ (\S+) :", l).group(1)) for l in
                lire(f"{D}/controles/aucune-valeur-reelle.txt").splitlines() if re.match(r"^✓ \S+ : occurrences", l))
controle("journaux bruts qui portent une valeur (motifs d'extraire.py) = les 13 contrôlés", avec, treize,
         "« 74 valeurs cherchées dans 13 journaux » — le choix des journaux laisse-t-il passer une valeur ?")
constat(f"parcouru : {len(tous)} journaux bruts de D316 (d316/ et r25/)")
# Ce qui est PARTI, c'est le contenu commité à a65d40d : copié depuis les objets git dans le dossier hors dépôt, pour que
# la réponse ne dépende pas de l'arbre du jour.
COPIES = os.path.join(HORS, "partis-a65d40d")
partis = []
for f in changes:
    o = montreb(FIN, f)
    if not o and f not in git("ls-tree", "-r", "--name-only", FIN, f):
        continue
    dest = os.path.join(COPIES, f)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, "wb").write(o)
    partis.append(dest)
# ⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298, D290), troisième passe : le contrôle ne lisait que « fichiers · porteurs » — un
# « 0 porteur » sur ZÉRO valeur cherchée aurait été un zéro creux. Les valeurs cherchées sont exigées à côté.
for outil, nom, nv in (("docs/preuves/D299/outils/aucune-valeur-reelle.py", "jetons", "74"),
                       ("docs/preuves/D315/controles/aucun-cookie-reel.py", "cookie", "145")):
    code, s = rejouer([sys.executable, outil, *[version_d316(t) for t in treize], "--", *partis], RACINE)
    s = s.decode("utf-8")
    m = re.search(r"valeurs cherchées : (\d+) \((\d+) journal/journaux\) · parcourus : (\d+) fichiers, \d+ octets · porteurs : (\d+)", s)
    controle(f"« 0 valeur réelle » ({nom}), rejoué sur les {len(partis)} fichiers qu'a fait partir a65d40d : valeurs · journaux · "
             "fichiers · porteurs · code", (m.groups() if m else None, code), ((nv, "13", str(len(partis)), "0"), 0),
             f"« {nv} valeurs … 13 journaux … 0 porteur » (sur 85 fichiers alors ; ici tout ce qui est parti)")
PREF = "(?:" + "te" + "st|li" + "ve)_(?:p" + "k|s" + "k)_"
LARGE = re.compile(PREF + "[A-Za-z0-9]{20,}")
synth = "te" + "st_" + "s" + "k_" + ("Ab3" * 14)[:40]
calibration("forme Chargily, calibration : synthétique trouvée · trop courte non trouvée",
         (bool(LARGE.search(synth)), bool(LARGE.search("te" + "st_" + "p" + "k_" + "Ab3"))), (True, False), "cas construits")
ch_porteurs = [f for f in partis if LARGE.search(open(f, "rb").read().decode("utf-8", "replace"))]
controle(f"forme Chargily sur les {len(partis)} fichiers partis", ch_porteurs, [], "« 0 porteur »")

# ------------------------------------------------------------------ 8. passe D277
print("== 8. passe D277 de D316")
controle("balayage.py : empreinte (préfixe)", sha256(open(f"{D}/passe-d277/balayage.py", "rb").read())[:8], "24802faf",
         "« copie à l'octet … (24802faf…) »")
mot = [l for l in lire(f"{D}/passe-d277/motifs.txt").splitlines() if l and not l.startswith("#")]
controle("motifs : sens 1 et 2 · témoins", (sum(l[:2] in ("1|", "2|") for l in mot), sum(l.startswith("T") for l in mot)), (18, 2),
         "« 18 + 2 témoins »")
controle("motifs : « rang 25 », « relecteur », « 404 » seuls absents des motifs", [l for l in mot if l.split("|", 1)[1].strip().lower()
                                                                              in ("rang 25", "relecteur", "404")], [], "« écartés avant la première passe »")
corpus = sum(len(plat(montre(FIN, f))) for f in AUTORITE)
tetes = {nn: open(f"{D}/passe-d277/{nn}", encoding="utf-8").readline() for nn in
         ("balayage-1.txt", "balayage-apres-ecriture.txt", "balayage-controle.txt")}
arbre = {nn: int(re.search(r"arbre (\d+) car", h).group(1)) for nn, h in tetes.items()}
controle("balayage-après : arbre = corpus commité à a65d40d", arbre["balayage-apres-ecriture.txt"], corpus,
         "« pris après la dernière écriture de texte »")
controle("balayage-contrôle = balayage-après (octets)",
         open(f"{D}/passe-d277/balayage-controle.txt", "rb").read() == open(f"{D}/passe-d277/balayage-apres-ecriture.txt", "rb").read(),
         True, "« doit rendre les mêmes comptes »")
controle("balayage-1 pris avant la dernière écriture (arbre plus petit)", arbre["balayage-1.txt"] < corpus, True, "« première passe »")

# ------------------------------------------------------------------ 9. écritures de D316, relues à a65d40d
print("== 9. écritures de D316 relues à a65d40d")
cont = montre(FIN, "ZWADJ_CONTINUITE.md")
controle("registre : dernière ligne D316", cont.rstrip().splitlines()[-1].startswith("| D316 |"), True, "registre")
controle("titre du rang 25 : CLOS LE 27/09/2026 : D316", "rang 25 · `[CODE]` **les trois défauts vus par D315** ⛔ ~~**OUVERT LE "
         "26/09/2026 : D316**~~ ⛔ **CLOS LE 27/09/2026 : D316**" in cont, True, "point d'entrée")
ordre = cont[cont.index("## ORDRE DES RANGS"):cont.index("## ~~PROCHAIN LOT~~ — rang 25")]
rangs = re.findall(r"^⇒ \*\*RANG (\d+) : EN ATTENTE", ordre, re.M)
controle("ordre des rangs : dernière ligne « ⇒ RANG N » non barrée", rangs[-1] if rangs else None, "26", "« RANG 26 : EN ATTENTE »")
controle("point d'entrée du rang 25 : « dix » barré, « neuf » écrit", "~~**dix**~~ **neuf**" in cont, True, "fautes, n° 2")
controle("méthode renforcée : bloc D316", "#### ⛔ DÉCISION DU RELECTEUR (chat), DÉLÉGUÉE PAR KO LE 26/09/2026 (D316)" in cont, True,
         "« méthode renforcée, bloc D316 »")
ag = plat(montre(FIN, "AGENTS.md"))
controle("AGENTS.md : quatre annotations D316",
         [s_ in ag for s_ in ("(D316, 26/09/2026 : rang 25 **arbitré par Ko — lot de CODE**", "(D316, mesuré sur vitest 3.2.7) DEUX "
                              "SIGNATURES DE PLUS", "(D316, 26/09/2026 : **ce premier lot de code a eu lieu**",
                              "DÉLÉGUÉE PAR KO LE 26/09/2026 (D316)")], [True] * 4,
         "table « ce qui a atterri » : règle de D270, signatures, pointeur d'état, point E3")
blg = montre(FIN, "ZWADJ_BACKLOG.md")
sec = blg[blg.index("## Reports du 26/09/2026 — rang 25, les trois défauts de D315 réparés (D316)"):
          blg.index("## Reports du 26/09/2026 — rang 24 CLOS")]
entrees = re.split(r"\n(?=- \[ \] )", sec)[1:]


def forme_d302(e: str) -> bool:
    p = plat(e)
    return ("BLOQUE" in p or "ordonner par Ko" in p) and "COÛT" in p


calibration("calibration forme D302 : bras négatif (sans COÛT) · bras positif (« ordonner⏎par Ko »)",
         (forme_d302("- [ ] x ⇒ **BLOQUE** : y"), forme_d302("- [ ] ⇒ **À ordonner\n  par Ko**. ⇒ **COÛT** : z")), (False, True), "cas connus")
controle("reports de D316 : entrées ouvertes, chacune (BLOQUE ou « à ordonner par Ko ») et COÛT, texte aplati",
         (len(entrees), [forme_d302(e) for e in entrees]), (4, [True] * 4), "« neuf liens, clé arabe, 182 dates, recompilations »")
sec315 = blg[blg.index("## Reports du 26/09/2026 — rang 24 CLOS"):]
sec315 = sec315[:sec315.index("\n## ", 5)]
coches = [e for e in re.split(r"\n(?=- \[[ x]\] )", sec315) if e.startswith("- [x]") and "(D316, 26/09/2026) RÉPARÉ AU RANG" in plat(e)]
controle("reports de D315 : entrées cochées avec leur motif D316", len(coches), 3, "« trois entrées cochées avec leur motif »")
controle("[DOC][P3] « POURQUOI (b) » annoté D316", "(D316, 26/09/2026 : il suit désormais l'arbitrage du rang 25 et « RANG 26" in plat(blg),
         True, "« annotée : elle suit désormais « RANG 26 » »")
diff = git("diff", "-U0", DEPART, FIN, "--", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md")
supp = [l[1:] for l in diff.splitlines() if l.startswith("-") and not l.startswith("---")]
tout = plat(cont + montre(FIN, "AGENTS.md") + blg)
perdus = [l[:80] for l in supp if any(tout.count(mm) == 0 for mm in re.findall(r"[\wÀ-ÿ]{4,}", re.sub(r"~~", "", l)))]
constat(f"parcouru : {len(supp)} lignes supprimées par D316 dans les trois .md")
controle("lignes supprimées dont un mot (≥ 4 lettres) a disparu des trois fichiers", perdus, [], "D276 : barré, pas effacé")

# ------------------------------------------------------------------ 10. limites
print("== 10. limites écrites par D316")
# Un relevé des fenêtres porterait au moins la recompilation ET l'une de ses heures ; les extraits n'ont plus les lignes
# « [WebServer] », où vit « File change detected » : ils ne peuvent pas le porter.
rec = [f for f in g(f"{D}/**/*") if os.path.isfile(f) and f.endswith(".txt")
       and "File change detected" in (t_ := open(f, encoding="utf-8", errors="replace").read())
       and re.search(r"23:20:5\d|00:14:3\d|11:20:5\d|12:14:3\d", t_)]
controle("pièce portant le relevé « aucun fichier suivi ne change dans ces fenêtres (relevé par horodatage) »", bool(rec), True,
         "D291 : une mesure nomme sa pièce")
constat(f"pièces de D316 qui portent une recompilation et l'heure d'une des deux fenêtres : {rec or 'aucune'}")

print(f"\n{controles} contrôles · {ecarts} écart(s) (attendu : ce que la lecture trouve — chaque ✗ se lit à son contexte)")
