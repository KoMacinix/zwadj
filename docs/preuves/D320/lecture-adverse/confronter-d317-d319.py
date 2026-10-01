"""D320 — lecture adverse depuis la clôture de D316 : D317, D318, D319.

POURQUOI IL EXISTE
  La forme exigée par Ko pour le rang 27 (point d'entrée, écrite par D318) demandait, en partie B, « lecture adverse
  depuis la clôture de D317 ». Ni D318 ni D319 ne l'ont faite (0 occurrence de « lecture adverse de D317 » dans le
  fichier de continuité à a53943e). Cet instrument la fait : chaque chiffre des sections D317, D318, D319 est
  confronté à SA pièce, l'attendu (le texte de la section) imprimé à côté du mesuré (D290), et chaque compteur dit ce
  qu'il a parcouru.

USAGE, depuis la racine :
    python3 docs/preuves/D320/lecture-adverse/confronter-d317-d319.py > <sortie>     (bash ; jamais PowerShell, D298)

CE QU'IL LIT
  - l'état COMMITÉ par les objets git, à des SHA fixés (a922537, e4bb432, 91e0922, a53943e) : rejouable à un HEAD
    ultérieur ;
  - les journaux BRUTS de D317 encore sur disque (.neutralisation-journaux/d317/, hors dépôt), chacun confronté à
    l'empreinte que porte l'en-tête de son extrait versé — un journal absent ou d'empreinte différente est dit, pas
    supposé ;
  - deux re-mesures qui n'écrivent rien : verifier-mutations.py r26 (en mémoire, arbre vérifié identique avant et
    après) et tsc --listFilesOnly (lecture seule) — légitimes parce qu'aucun fichier hors .md d'autorité et
    docs/preuves n'a changé depuis a922537 (contrôle T0, exigé AVANT de les croire) ;
  - les tris différentiels d'audit, REJOUÉS par l'outil de D299 (alertes-nouvelles.py), non recopiés.

CE QU'IL N'IMPORTE PAS : aucun outil de D317, D318 ou D319 n'est importé ; les deux outils lancés (D299, neutralisation)
  le sont comme des sous-processus, et leur sortie est lue.

INSTRUMENTS CONCURRENTS ÉCARTÉS : rejouer confronter-d316.py de D317 — il confronte D316, pas D317 ; relire les
  sections à l'œil — c'est ce qui a laissé passer les chiffres sans pièce (D291).

CALIBRATION (rejouée à chaque lancement, abandon si un bras manque) : le lecteur de compte de tests et le lecteur de
  « code=… durée=… » sont essayés sur deux chaînes dont la réponse est connue (un positif, un négatif) ; l'extracteur
  de délai de fiche sur une ligne connue. Voir calibrer().
"""
import hashlib
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

ANSI = re.compile(r"\x1b\[[0-9;]*m")
D317, D318, D319A, D319 = "a922537", "e4bb432", "91e0922", "a53943e"
NB = {"vus": 0, "ecarts": 0, "constats": 0}


def git(*a, binaire=False):
    r = subprocess.run(["git", *a], capture_output=True, check=True)
    return r.stdout if binaire else r.stdout.decode("utf-8").strip()


def lire(sha, chemin):
    return ANSI.sub("", git("show", f"{sha}:{chemin}", binaire=True).decode("utf-8"))


def aplati(t):
    return re.sub(r"\s+", " ", t)


def fichiers(parent, sha):
    return git("diff", "--name-only", parent, sha).splitlines()


def chk(cle, texte, attendu, mesure, ok=None):
    """Une confrontation : l'attendu (le texte de la section) à côté du mesuré (la pièce)."""
    NB["vus"] += 1
    ok = (attendu == mesure) if ok is None else ok
    if not ok:
        NB["ecarts"] += 1
    print(f"{'✓' if ok else '✗'} {cle:5s} {texte} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(cle, texte):
    NB["constats"] += 1
    print(f"· {cle:5s} CONSTAT : {texte}")


def code_duree(t):
    m = re.search(r"code=(\d+) durée=(\d+)s", t)
    return (int(m.group(1)), int(m.group(2))) if m else None


def comptes_vitest(t):
    """[(tests, fichiers)] dans l'ordre d'apparition des résumés vitest."""
    f = [int(x) for x in re.findall(r"Test Files\s+(\d+) passed", t)]
    s = [int(x) for x in re.findall(r"^\s+Tests\s+(\d+) passed", t, re.M)]
    return list(zip(s, f))


def delais(t):
    # passe 1 : `$` en mode multiligne ne s'arrête pas avant un `\r` — la pièce est en CRLF, l'extracteur rendait [] ;
    # c'est le défaut (a) de l'instrument de D317, reproduit ici. Bras CRLF ajouté à la calibration.
    return [float(x) for x in re.findall(r": (\d+\.\d) s\r?$", t, re.M)]


def calibrer():
    bras = [
        ("comptes vitest, positif", comptes_vitest(" Test Files  3 passed (3)\n      Tests  12 passed (12)\n"), [(12, 3)]),
        ("comptes vitest, négatif (échec, aucun « N passed » contigu)",
         comptes_vitest(" Test Files  1 failed | 2 passed (3)\n      Tests  1 failed (12)\n"), []),
        ("code/durée, positif", code_duree("…\ncode=0 durée=37s début=11:58:12"), (0, 37)),
        ("code/durée, négatif", code_duree("…\ncode=0 duree=37s"), None),
        ("délai de fiche, positif", delais("   fiche n°1 : recherche a → données b : 7.4 s\n"), [7.4]),
        ("délai de fiche, positif CRLF (ajouté après la passe 1)", delais("   fiche n°1 : recherche a → données b : 7.4 s\r\n"), [7.4]),
        ("délai de fiche, négatif", delais("   fiche n°1 : APPARIEMENT INVALIDE — non mesuré\n"), []),
    ]
    manques = 0
    for nom, obtenu, attendu in bras:
        bon = obtenu == attendu
        manques += not bon
        print(f"  calibration {'✓' if bon else '✗'} {nom} : {obtenu!r} (attendu {attendu!r})")
    print(f"  calibration : {len(bras)} bras · {manques} manqué(s) (attendu 0)")
    if manques:
        sys.exit("CALIBRATION MANQUÉE — abandon")


def brut(chemin, empreinte_attendue):
    """Le journal brut sur disque, s'il existe ET porte l'empreinte de l'en-tête de son extrait."""
    if not os.path.exists(chemin):
        constat("BRUT", f"{chemin} absent du disque — non confronté")
        return None
    b = open(chemin, "rb").read()
    h = hashlib.sha256(b).hexdigest()
    chk("BRUT", f"empreinte de {chemin}", empreinte_attendue, h[: len(empreinte_attendue)])
    return ANSI.sub("", b.decode("utf-8", "replace")) if h.startswith(empreinte_attendue) else None


def entete_sha(t):
    m = re.search(r"sha256 du journal complet ([0-9a-f]{64})", t)
    return m.group(1) if m else None


print("== CALIBRATION")
calibrer()

# ------------------------------------------------------------------------------------------------ T0 : préalable
print("\n== T0 — préalable aux re-mesures : rien hors .md d'autorité et docs/preuves n'a changé depuis a922537")
hors = [f for f in fichiers(D317, "HEAD")
        if not f.startswith("docs/preuves/") and f not in ("AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "CLAUDE.md")]
chk("T0", f"fichiers hors .md/docs/preuves changés a922537..HEAD ({len(fichiers(D317, 'HEAD'))} examinés)", [], hors)

# ------------------------------------------------------------------------------------------------ D317 : provenance
print("\n== D317 — provenance (objets git)")
chk("P1", "parent de a922537", "a65d40d", git("rev-parse", "--short", f"{D317}^"))
f317 = fichiers(f"{D317}^", D317)
attendus = {"AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md", "e2e/fixtures/harness.ts", "e2e/playwright.config.ts",
            "e2e/specs/r26-parcours-reservation.e2e.ts", "e2e/specs/warmup.setup.ts", "neutralisation/neutralize-r26.py"}
chk("P2", f"fichiers hors docs/preuves = table des fichiers attendus ({len(f317)} examinés)", sorted(attendus),
    sorted(f for f in f317 if not f.startswith("docs/preuves/")))
rect = "docs/preuves/D316/neutralisation/passe-officielle/RECTIFICATION-D317.txt"
preuves = [f for f in f317 if f.startswith("docs/preuves/")]
chk("P3", "pièces : toutes sous D317/ ou la rectification posée à côté de D316", [],
    [f for f in preuves if not (f.startswith("docs/preuves/D317/") or f == rect)])
chk("P3b", "nombre de pièces (59 sous D317/ + 1 rectification)", 60, len(preuves))
chk("P4", "aucun fichier de code produit (apps/, packages/) au commit", [],
    [f for f in f317 if f.startswith(("apps/", "packages/"))])
anc = subprocess.run(["git", "merge-base", "--is-ancestor", D317, "origin/main"]).returncode
chk("P5", "a922537 ancêtre de origin/main", 0, anc)
h = lire(D317, "e2e/fixtures/harness.ts")
chk("P6", "createPublishedVenue garde ses trois champs et AJOUTE pro (« ajout seul »)", True,
    "nameFr: string; pro: Account }>" in h and "return { id, slug, nameFr, pro };" in h)

# ------------------------------------------------------------------------------------------------ D317 : portes
print("\n== D317 — les portes (extraits versés, journaux bruts)")
PO = "docs/preuves/D317/portes/"
portes = {"typecheck": (37, None), "lint": (17, None), "test": (90, None), "build": (81, None),
          "test-int": (525, None), "test-e2e": (212, None)}
ext = {k: lire(D319, f"{PO}{k}-extrait.txt") for k in portes}
for k, (duree, _) in portes.items():
    chk("G1", f"{k} : code et durée", (0, duree), code_duree(ext[k]))
chk("G2", "typecheck : « Done »", 8, ext["typecheck"].count(": Done"))
chk("G2b", "typecheck : « error TS »", 0, ext["typecheck"].count("error TS"))
chk("G3", "lint : « Done »", 8, ext["lint"].count(": Done"))
chk("G4", "test : 664/58 · 39/4 · 308/22 · 347/28", [(664, 58), (39, 4), (308, 22), (347, 28)], comptes_vitest(ext["test"]))
chk("G5", "build : « Done »", 4, ext["build"].count(": Done"))
chk("G6", "test:int : 444/36", [(444, 36)], comptes_vitest(ext["test-int"]))
chk("G7", "e2e : 43 réussis · 1 ignoré",
    ("43", "1"), (re.search(r"(\d+) passed", ext["test-e2e"]).group(1), re.search(r"(\d+) skipped", ext["test-e2e"]).group(1)))
for k in portes:
    t = brut(f".neutralisation-journaux/d317/portes/{k}.log", entete_sha(ext[k]))
    if k == "test-e2e" and t is not None:
        chk("G8", "journal e2e BRUT : « File change detected » (l'extrait a retiré les lignes [WebServer])", 0,
            t.count("File change detected"))
em = lire(D319, f"{PO}etat-machine-avant-portes.txt")
champ = lambda n: re.search(rf"^{n}=([^\s]+)", em, re.M).group(1)
chk("G9", "état machine avant les portes : RAM · PERF · secteur · node · chrome",
    ("3645", "68.5", "SECTEUR", "0", "30"),
    (champ("RAM_MEDIANE_MO").split(".")[0], champ("PERF_MEDIANE_PCT"), champ("ALIM_SOURCE"), champ("NODE"), champ("CHROME")))

# ------------------------------------------------------------------------------------------------ D317 : campagnes
print("\n== D317 — la campagne du lot et le rejeu de r25")
NE = "docs/preuves/D317/neutralisation/"
c26 = lire(D319, f"{NE}campagne-r26-extrait.txt")
chk("C1", "r26 : mordues / jouées", "2 garde(s) mordue(s) sur 2", re.search(r"\d+ garde\(s\) mordue\(s\) sur \d+", c26).group(0))
chk("C1b", "r26 : code et durée", (0, 386), code_duree(c26))
chk("C1c", "r26 : Playwright exigé", "1.50.1", re.search(r"Version (\S+)", c26).group(1))
chk("C1d", "r26 : calibration", "6 bras · 0 manqué(s)", re.search(r"\d+ bras · \d+ manqué\(s\)", c26).group(0))
chk("C1e", "r26 : mutations prouvées posées dans la campagne (ancre 1→0 · marqueur 0→1)", 2, c26.count("ancre 1→0 · marqueur 0→1"))
avant = git("status", "--porcelain")
vm = subprocess.run([sys.executable, "neutralisation/verifier-mutations.py", "r26"], capture_output=True)
vm_t = vm.stdout.decode("utf-8", "replace")
chk("C2", "verifier-mutations.py r26, REJOUÉ (aucune pièce versée par D317) : posées · non posées",
    ("2", "0"), tuple(re.search(r"POSEES (\d+)\s+·\s+NON POSEES (\d+)", vm_t).groups()) if "POSEES" in vm_t else None)
chk("C2b", "arbre identique avant/après verifier-mutations", avant, git("status", "--porcelain"))
c25 = lire(D319, f"{NE}rejeu-r25-e2e-20260927-1222/campagne-extrait.txt")
chk("C3", "rejeu r25 --e2e : mordues / jouées · non mesurées",
    ("10 garde(s) mordue(s) sur 10", "1"),
    (re.search(r"\d+ garde\(s\) mordue\(s\) sur \d+", c25).group(0), re.search(r"(\d+) non mesurée", c25).group(1)))
chk("C3b", "rejeu r25 : code et durée", (3, 783), code_duree(c25))
chk("C3c", "rejeu r25 : R25-E1 à E3 mordues", 3, len(re.findall(r"^✓ R25-E[123]\.", c25, re.M)))
lc = lire(D319, f"{NE}lancer-campagnes-extrait.txt")
chk("C4", "lancer-campagnes : campagnes concernées", "0 campagne(s) concernée(s) sur 30",
    re.search(r"\d+ campagne\(s\) concernée\(s\) sur \d+", lc).group(0))
for nom, ex in (("campagne-r26.log", c26), ("campagne-r25-e2e.log", c25), ("lancer-campagnes.log", lc)):
    brut(f".neutralisation-journaux/d317/{nom}", entete_sha(ex))

# ------------------------------------------------------------------------------------------------ D317 : étape 1
print("\n== D317 — étape 1 (recompilations de l'API)")
E1 = "docs/preuves/D317/etape1/"
rr = lire(D319, f"{E1}releve-rouge-avant-correctif.txt")
rv = lire(D319, f"{E1}releve-vert-apres-correctif.txt")
bras = lambda t: [(int(a), int(b)) for a, b in re.findall(r"sondes (\d+) · en échec (\d+)", t)]
chk("E1", "rouge : (sondes, en échec) T, L, W, W", [(105, 0), (107, 0), (106, 21), (105, 23)], bras(rr))
chk("E2", "vert : (sondes, en échec)", [(103, 0), (106, 0), (106, 0), (106, 0)], bras(rv))
mr = lire(D319, f"{E1}mesure-rouge-extrait.txt")
t = brut(".neutralisation-journaux/d317/mesure-rouge.log", entete_sha(mr))
if t is not None:
    chk("E3", "rouge, journal brut : « File change detected »", 2, t.count("File change detected"))
    chk("E3b", "rouge, journal brut : heures des deux recompilations", ["11:37:47", "11:37:59"],
        re.findall(r"\[(\d\d:\d\d:\d\d) [ap]\.m\.\] File change detected", t))
    chk("E3c", "rouge, journal brut : démarrages de l'application", 3, t.count("Nest application successfully started"))
mv = lire(D319, f"{E1}mesure-vert-extrait.txt")
t = brut(".neutralisation-journaux/d317/mesure-vert.log", entete_sha(mv))
if t is not None:
    chk("E4", "vert, journal brut : « File change detected » · démarrages", (0, 1),
        (t.count("File change detected"), t.count("Nest application successfully started")))
ss = lire(D319, f"{E1}sonde-surveillance-sortie.txt")
rec = lambda motif: int(re.search(rf"\[{motif}[^\]]*\].*?recompilations (\d+)", ss).group(1))
chk("E5", "observateur : recompilations T · W · S1 · S2 · A* · S1*", (0, 2, 0, 0, 0, 0),
    (rec("T "), rec("W "), rec("S1 "), rec("S2 "), rec(r"A\*"), rec(r"S1\*")))
chk("E5b", "observateur : TypeScript", "5.9.3", re.search(r"Version (\S+)", ss).group(1))
ot = lire(D319, f"{E1}observateur-tsc-extrait.txt")
t = brut(".neutralisation-journaux/d317/observateur-tsc.log", entete_sha(ot))
if t is not None:
    fw = [l for l in t.splitlines() if l.startswith("FileWatcher:: Triggered with")]
    recul = [l for l in fw if "/apps/api/src/generated/" in l.replace("\\", "/") and "zz-sonde" not in l]
    chk("E6", f"« les surveillants se déclenchent (97 fois) » sur les RECULS du dernier accès ({len(fw)} déclenchements "
        "FileWatcher parcourus ; aucune pièce versée par D317)", 97, len(recul))
    if len(fw) == 97:
        constat("E6", f"97 = TOUS les déclenchements FileWatcher du journal ; {len(fw) - len(recul)} vient de l'écriture "
                "zz-sonde (bras W, qui recompile) — l'attribution aux reculs compte un déclenchement de trop ; "
                "conclusion (aucune recompilation sur un recul) inchangée")
lf = subprocess.run("npx tsc -p tsconfig.build.json --listFilesOnly", cwd="apps/api", shell=True, capture_output=True)
L = [x.strip().replace("\\", "/") for x in lf.stdout.decode("utf-8", "replace").splitlines() if x.strip()]
api = [x for x in L if "/apps/api/src/" in x]
chk("E7", "programme surveillé, re-mesuré (tsc --listFilesOnly ; aucune pièce versée par D317) : apps/api/src · "
    "dont generated · packages/types/src · messages",
    (158, 47, 13, ["ar.json", "fr.json"]),
    (len(api), sum("/src/generated/" in x for x in api), sum("/packages/types/src/" in x for x in L),
     sorted(x.rsplit("/", 1)[1] for x in L if "/packages/i18n/messages/" in x)))
chk("E7b", f"programme surveillé, total ({len(L)} lignes parcourues)", 1072, len(L))
if len(L) != 1072:
    constat("E7b", "l'écart tient dans node_modules (les sous-comptes du projet concordent) ; D317 n'a versé ni listing ni "
            "définition de son total — l'écart n'est pas attribuable (D290 : deux comptes ne se comparent que s'ils comptent "
            "la même chose)")
pc = lire(D317, "e2e/playwright.config.ts")
chk("E8", "correctif : l'API de l'e2e lancée par `exec nest start`, plus par `run dev`", (True, False),
    ("@zwadj/api exec nest start" in pc, "@zwadj/api run dev" in pc))

# ------------------------------------------------------------------------------------------------ D317 : étape 2
print("\n== D317 — étape 2 (le parcours)")
sp = lire(D317, "e2e/specs/r26-parcours-reservation.e2e.ts")
chk("S1", "deux tests", 2, len(re.findall(r"^\s*test\(\s*[\"'`]", sp, re.M)))
chk("S2", "libellés tirés de fr.json (import du fichier de messages)", True, "messages/fr.json" in sp)
chk("S3", "aucun attribut de test dans la spec", 0, sp.count("data-testid") + sp.count("getByTestId"))
chk("S4", "le préchauffage visite la route dynamique", True,
    "/fr/salles/prechauffage-route-dynamique" in lire(D317, "e2e/specs/warmup.setup.ts"))
df = lire(D319, "docs/preuves/D317/etape2/delai-fiche-sortie.txt")
d = delais(df)
chk("S5", "délais : premier passage · rouge · vert-1 · vert-2 (fiche 1, fiche 2)",
    [7.4, 2.0, 5.4, 1.6, 1.7, 1.7, 1.7, 1.7], d[:8], ok=d[:4] == [7.4, 2.0, 5.4, 1.6] and d[4] == 1.7 and d[6:8] == [1.7, 1.7])
if d[5] != 1.7:
    constat("S5", f"« Vert, deux passages : 1,7 s au premier test comme au second » — vert-1, second test : {d[5]} s "
            "(les trois autres valeurs : 1,7) ; la conclusion (7,4 / 5,4 → 1,7 / 1,7 au premier test) tient")
pieces317 = [f for f in git("ls-tree", "-r", "--name-only", D319, "docs/preuves/D317/").splitlines()]
# passe 2 : la première forme (« 6,2 OU 0,6 ») a rendu un FAUX VERT — le seul « 0.6 s » trouvé est l'appariement
# invalide de delai-fiche-sortie-passe1.txt (porte e2e, 12:13), sans rapport avec MD2-g. Exigé désormais : les DEUX
# valeurs dans la MÊME pièce, et chaque occurrence imprimée avec son contexte.
hits = []
for f in pieces317:
    t = git("show", f"{D319}:{f}", binaire=True).decode("utf-8", "replace")
    a, b = list(re.finditer(r"\b6[.,]2 ?s\b", t)), list(re.finditer(r"\b0[.,]6 ?s\b", t))
    for m in a + b:
        print(f"  · S6 occurrence : {f} …{t[max(0, m.start() - 70):m.end() + 20]!r}…")
    if a and b:
        hits.append(f)
chk("S6", f"MD2-g « 6,2 s après le clic, contre 0,6 s » : pièces qui portent LES DEUX valeurs ({len(pieces317)} parcourues)",
    "≥ 1", len(hits), ok=len(hits) >= 1)
for nom in ("r26-premier", "r26-rouge-prechauffage", "r26-vert-prechauffage-1", "r26-vert-prechauffage-2"):
    m = re.search(rf"{nom}\.log · sha256 ([0-9a-f]+)…", df)
    brut(f".neutralisation-journaux/d317/{nom}.log", m.group(1) if m else "?")

# ------------------------------------------------------------------------------------------------ D317 : contrôles
print("\n== D317 — contrôles « 0 valeur réelle », Chargily, audits")
CT = "docs/preuves/D317/controles/"
dern = lambda t: re.search(r"valeurs cherchées : (\d+) \((\d+) journal/journaux\) · parcourus : (\d+) fichiers.*porteurs : (\d+)", t).groups()
chk("K1", "jetons, premier passage : valeurs · journaux · fichiers · porteurs", ("92", "11", "55", "0"),
    dern(lire(D319, f"{CT}aucune-valeur-reelle.txt")))
chk("K2", "cookie, premier passage", ("215", "11", "55", "0"), dern(lire(D319, f"{CT}aucun-cookie-reel.txt")))
cf = lire(D319, f"{CT}controle-forme-chargily-sortie.txt")
chk("K3", "forme Chargily, premier passage : fichiers · porteurs", ("56", "0"),
    re.search(r"parcourus : (\d+) fichiers.*porteurs : (\d+)", cf).groups())
nctx = lambda sha, p: int(re.search(r"(\d+) contexte", lire(sha, p)).group(1)) if re.search(r"(\d+) contexte", lire(sha, p)) else None


def tri(prec, nouv):
    r = subprocess.run([sys.executable, "docs/preuves/D299/outils/alertes-nouvelles.py", prec, nouv], capture_output=True)
    t = r.stdout.decode("utf-8", "replace")
    m = re.search(r"\((\d+) contextes\) · nouvelle .*?\((\d+) contextes\)", t)
    n = re.search(r"alertes ABSENTES de la précédente : (\d+)", t)
    return (int(m.group(1)), int(m.group(2)), int(n.group(1))) if m and n else ("illisible", t[-300:])


chk("K4", "tri REJOUÉ D316 final → D317 : contextes · nouvelles", (136, 142, 6),
    tri("docs/preuves/D316/audit-secrets-final.txt", "docs/preuves/D317/audit-secrets-d317.txt"))
chk("K5", "tri REJOUÉ D317 → D317 final", (142, 148, 6),
    tri("docs/preuves/D317/audit-secrets-d317.txt", "docs/preuves/D317/audit-secrets-final.txt"))

# ------------------------------------------------------------------------------------------------ D318
print("\n== D318")
f318 = fichiers(f"{D318}^", D318)
chk("Q1", "parent de e4bb432", "a922537", git("rev-parse", "--short", f"{D318}^"))
chk("Q2", f"fichiers du commit ({len(f318)} examinés)",
    sorted(["AGENTS.md", "ZWADJ_CONTINUITE.md", "docs/preuves/D318/audit-secrets-d318.txt", "docs/preuves/D318/audit-secrets-final.txt"]),
    sorted(f318))
chk("Q3", "tri REJOUÉ D317 final → D318 : contextes · nouvelles (aucune pièce de tri versée par D318)", (148, 148, 0),
    tri("docs/preuves/D317/audit-secrets-final.txt", "docs/preuves/D318/audit-secrets-d318.txt"))
c318 = aplati(lire(D318, "ZWADJ_CONTINUITE.md"))
s318 = c318[c318.index("## Session du 01/10/2026 — D318"):c318.index("## ~~PROCHAIN LOT~~ — rang 26")]
constat("Q4", f"section D318 ({len(s318)} caractères parcourus) : « lecture adverse » {s318.count('lecture adverse')} "
        "occurrence(s) — la forme de Ko la plaçait en PARTIE B (D319), pas en partie A : D318 n'en devait pas")
chk("Q5", "section D318 : une passe D277 écrite (« passe D277 » ou « D277 »)", "≥ 1", s318.count("D277"),
    ok=s318.count("D277") >= 1)
ag = aplati(lire(D318, "AGENTS.md"))
occ = [m.start() for m in re.finditer(r"pas d'app admin", ag)]
sans = [i for i in occ if "D318" not in ag[i:i + 400]]
chk("Q6", f"AGENTS.md à e4bb432 : « pas d'app admin » non annoté par D318 ({len(occ)} occurrence(s) parcourue(s))",
    0, len(sans))
for i in sans:
    constat("Q6", f"…{ag[max(0, i - 120):i + 60]}…")
# ajouté après la passe 3 : relevé en préparant l'écriture du bloc D320 de la méthode renforcée — le point d'entrée du
# rang 27 renvoie à « méthode renforcée, bloc D318 ». Un renvoi se confronte à sa cible.
brut318 = lire(D318, "ZWADJ_CONTINUITE.md")
mr0 = brut318.index("### ⛔ E3 — MÉTHODE RENFORCÉE (D126)")
mr1 = brut318.index("#### Les trois invariants produit", mr0)
blocs = re.findall(r"^#### ⛔ .*$", brut318[mr0:mr1], re.M)
chk("Q7", f"renvoi « méthode renforcée, bloc D318 » ({c318e_n} fois à e4bb432) : blocs titrés « (D318) » dans la méthode "
    f"renforcée ({len(blocs)} blocs parcourus)" if (c318e_n := aplati(brut318).count("méthode renforcée, bloc D318")) else "?",
    "≥ 1", sum("(D318)" in b for b in blocs), ok=sum("(D318)" in b for b in blocs) >= 1)
bl = aplati(lire(D318, "ZWADJ_BACKLOG.md"))
for motif in ("apps/admin", "app admin", "App Admin", "page d'administration", "écran d'administration"):
    print(f"  · backlog à e4bb432 : « {motif} » {bl.count(motif)} (relevé pour la passe D277 de D320, trié à la main)")

# ------------------------------------------------------------------------------------------------ D319
print("\n== D319")
chk("R1", "parent de 91e0922 · de a53943e", ("e4bb432", "91e0922"),
    (git("rev-parse", "--short", f"{D319A}^"), git("rev-parse", "--short", f"{D319}^")))
fa, fb = fichiers(f"{D319A}^", D319A), fichiers(f"{D319}^", D319)
chk("R2", "91e0922 : hors docs/preuves", ["ZWADJ_CONTINUITE.md"], [f for f in fa if not f.startswith("docs/preuves/")])
chk("R2b", "91e0922 : pièces toutes sous D319/", [], [f for f in fa if f.startswith("docs/preuves/") and not f.startswith("docs/preuves/D319/")])
chk("R3", "a53943e : hors docs/preuves", ["AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md"],
    sorted(f for f in fb if not f.startswith("docs/preuves/")))
chk("R3b", "a53943e : pièces toutes sous D319/", [], [f for f in fb if f.startswith("docs/preuves/") and not f.startswith("docs/preuves/D319/")])
PD = "docs/preuves/D319/passe-r27a-20261001-0155/"
dans_passe = git("ls-tree", "-r", "--name-only", D319, PD).splitlines()
chk("R4", "pièces de SA passe : 171 versées + 2 produites après", 173, len(dans_passe))
chk("R5", "réemploi du plancher : harnais changés 0057748..91e0922", ["neutralisation/neutralize-r25.py", "neutralisation/neutralize-r26.py"],
    git("diff", "--name-only", "0057748", D319A, "--", "neutralisation/").splitlines())
dep = git("diff", "--name-only", "0057748", D319A, "--", "pnpm-lock.yaml", "package.json", "*/package.json", ".npmrc",
          "pnpm-workspace.yaml").splitlines()
chk("R5b", "environnement du plancher : fichiers de dépendances changés 0057748..91e0922 (le motif écrit ne le dit pas)", [], dep)
c319 = aplati(lire(D319, "ZWADJ_CONTINUITE.md"))
c318e = aplati(lire(D318, "ZWADJ_CONTINUITE.md"))
chk("R6", "forme de Ko écrite par D318 : « planchers du point 12, mesurés avant tout commit de protocole »", 1,
    c318e.count("planchers du point 12, mesurés avant tout commit de protocole"))
chk("R6b", "motif du réemploi écrit AVANT la mesure (91e0922)", 1,
    aplati(lire(D319A, "ZWADJ_CONTINUITE.md")).count("refaire une mesure sur un fichier inchangé ne mesurerait rien de neuf"))
i0 = c319.index("### ⛔ LA CERTIFICATION QUI CLÔT LE RANG 27 (D319)")
i1 = c319.index("## ~~PROCHAIN LOT~~ — rang 26")
z319 = c319[i0:i1]
# passe 2 : « s'écarte » a rendu un FAUX VERT — il appartient à « un compte qui s'écarte suspend la marque », sans
# rapport avec le plancher (D295 : un motif qui attrape une autre phrase compte tout et ne mesure rien). Motifs
# restreints à ce qui dirait l'écart, chaque occurrence imprimée avec son contexte.
MOTIFS_R6C = ("forme de Ko", "forme exigée", "au lieu de les mesurer", "au lieu d'une mesure", "écart à la forme",
              "mesurés avant tout commit")
nomme = []
for m in MOTIFS_R6C:
    for x in re.finditer(re.escape(m), z319):
        nomme.append(m)
        print(f"  · R6c occurrence « {m} » : …{z319[max(0, x.start() - 120):x.end() + 60]}…")
chk("R6c", f"D319 nomme son réemploi comme un écart à la forme de Ko ({len(z319)} caractères parcourus, motifs : "
    + ", ".join(f"« {m} »" for m in MOTIFS_R6C) + ")", "≥ 1", len(nomme), ok=len(nomme) >= 1)
chk("R7", "D319 : lecture adverse de D317 faite ou déclarée non faite", "≥ 1",
    z319.count("lecture adverse"), ok=z319.count("lecture adverse") >= 1)
lc319 = lire(D319, f"{PD}lecture-campagnes.txt")
lignes = re.findall(r"^(\S+)\s+(--tout|--int|--e2e)\s.*?(\d+) s ≥ plancher ([\d.]+) s", lc319, re.M)
rapports = sorted(((int(s) / float(p), int(s) - float(p), n) for n, _, s, p in lignes))
serre_r = rapports[0][2] if rapports else None
serre_m = min(rapports, key=lambda x: x[1])[2] if rapports else None
chk("R8", f"« le plus serré : e3d1-s8, 80 s contre 8,4 s » ({len(lignes)} harnais à plancher parcourus) : le plus serré "
    "par rapport · par marge", ("e3d1-s8", "e3d1-s8"), (serre_r, serre_m))
if rapports:
    constat("R8", "trois plus serrés (rapport, marge, harnais) : " + " ; ".join(f"{n} ×{r:.2f} (+{m:.1f} s)" for r, m, n in rapports[:3]))
r25 = lire(D319, f"{PD}int-r25.log")
chk("R9", "int-r25.log : « une seule occurrence de [ dans tout le fichier »", 1, r25.count("["))
e2x = lire(D319, f"{PD}e2e-EXTRAIT.txt")
av = lire(D319, f"{PD}aucune-valeur-reelle.txt")
chk("R10", "« 0 valeur réelle » : valeurs · fichiers parcourus · porteurs", ("39", "2324", "0"),
    tuple(re.search(r"valeurs cherchées : (\d+) .*?parcourus : (\d+) fichiers.*porteurs : (\d+)", av).groups()))
csv = [l.split(";") for l in lire(D319, f"{PD}etat.csv").splitlines()[1:] if l.strip()]
from datetime import datetime
hs = [datetime.strptime(r[0].lstrip("\ufeff"), "%Y-%m-%d %H:%M:%S") for r in csv]
ec = [(b - a).total_seconds() for a, b in zip(hs, hs[1:])]
chk("R11", f"échantillonneur ({len(csv)} lignes parcourues) : échantillons · écart min · écart max · chrome max",
    (194, 31, 34, 0), (len(csv), int(min(ec)), int(max(ec)), max(int(r[7]) for r in csv)))
sous = [int(r[1]) for r in csv if int(r[1]) < 4579]
chk("R12", "échantillons sous la barre 4 579 · minimum", (44, 2966), (len(sous), min(sous) if sous else None))
chk("R13", "tri REJOUÉ D318 final → D319 (aucune pièce de tri versée par D319)", (148, 150, 2),
    tri("docs/preuves/D318/audit-secrets-final.txt", "docs/preuves/D319/audit-secrets-resultat.txt"))
chk("R13b", "tri REJOUÉ D319 → D319 final", (150, 150, 0),
    tri("docs/preuves/D319/audit-secrets-resultat.txt", "docs/preuves/D319/audit-secrets-final.txt"))
tri319 = [f for f in git("ls-tree", "-r", "--name-only", D319, "docs/preuves/D319/").splitlines() if "tri" in f.rsplit("/", 1)[1]]
# passe 3 : classé d'abord en écart. Lu au contexte : le tri est une fonction déterministe de deux sorties SCELLÉES et
# VERSÉES, que la section nomme ; rejoué (R13), il rend les mêmes comptes, et le « 106 fichiers » de D319 est le texte
# même de la sortie scellée (« valeur deja presente dans 106 fichier(s) suivi(s) hors preuves »). Même traitement que
# D318 (Q3) : un constat de forme, pas un chiffre sans source.
if not tri319:
    constat("R14", "aucune pièce de tri versée par D319 (D317 en versait) ; tri rejoué identique (R13), le « 106 fichiers » "
            "est lu dans la sortie scellée `audit-secrets-resultat.txt`, ligne de contexte de la 2ᵉ alerte — concordant")
prog = lire(D319, f"{PD}progression.txt")
chk("R15", "pré-vol : harnais e2e-verrouillés", "['r25', 'r26']", re.search(r"E2E-VERROUILLÉS.*?: (\[.*?\])", prog).group(1))
chk("R15b", "r25 rejoué à l'étape 6 avec les deux drapeaux (« cibles : 11 déclarées · 11 jouées (e2e, int, unit) »)", True,
    "11 déclarées · 11 jouées (e2e, int, unit)" in r25)
chk("R15c", "cibles e2e de r25 jouées et mordues à l'étape 6 (R25-E1 à E3)", 3, len(re.findall(r"^✓ R25-E[123]\.", r25, re.M)))
e26 = lire(D319, f"{PD}e2e-r26.log")
chk("R15d", "cibles e2e de r26 jouées et mordues à l'étape 6b (R26-1, R26-2)", 2, len(re.findall(r"^✓ R26-[12]\.", e26, re.M)))
t25 = lire(D319, f"{PD}campagnes/neutralize-r25.py.log")
chk("R15e", "--tout : cibles de r25 non mesurées (R25-8 int, R25-E1 à E3 e2e)", ["R25-8", "R25-E1", "R25-E2", "R25-E3"],
    sorted(re.findall(r"NON MESURÉE : (R25-[\dE]+)\.", t25)))
pp = lire(D319A, "docs/preuves/D319/outils/passe.py")
etape6 = pp[pp.index("6. rejeux --int"):pp.index("6b. [AJOUT D319]")]
if "ports_ecoutes" not in etape6:
    constat("R16", "l'étape 6 rejoue r25 AVEC --e2e sans relever les ports 3100/3101/5273 (l'étape 6b le fait pour r26) ; "
            "la sonde qui la précède porte « node 0 » (progression), et le pré-vol e2e de r25 est passé — la condition "
            "est tenue de fait, pas vérifiée")
reg = c319[c319.index("## Registre des décisions"):]
chk("R17", "registre : lignes D317, D318, D319", (1, 1, 1), tuple(len(re.findall(rf"\| D{n} \| A \|", reg)) for n in (317, 318, 319)))

print(f"\n{NB['vus']} contrôles · {NB['ecarts']} écart(s) · {NB['constats']} constat(s) "
      "(attendu : ce que la lecture trouve — chaque ✗ se lit à son contexte)")
