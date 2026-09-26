"""D313 — LECTURE ADVERSE DE D312 : ses chiffres confrontés à SES pièces, au disque et au dépôt. Pièce jetable, versée.
N'écrit rien : elle imprime. Chaque contrôle imprime l'attendu À CÔTÉ du mesuré (D290) et, quand il compte, ce qu'il a
parcouru. Les attendus sont ceux que la SECTION D312 (et le point d'entrée du rang 23) écrivent — recopiés de la section
pour être confrontés, jamais de mémoire. Un constat sans chiffre de la section s'imprime « · », il n'entre pas au compte
des écarts. Lit les journaux par sa PROPRE expression (aucun import du harnais ni du lecteur de D312).
Usage, depuis la racine :  python docs/preuves/D313/lecture-adverse/confronter-d312.py
"""
import ast
import hashlib
import os
import re
import subprocess
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)

ANSI = re.compile(r"\x1b\[[0-9;]*m")
D = "docs/preuves/D312"
HARNAIS = "neutralisation/neutralize-available-on-api.py"
DEPART, ETAPE0, FIN = "6f7d6c5", "071dfc2", "d37ea64"
ecarts, controles = 0, 0


def lire(chemin: str) -> str:
    return ANSI.sub("", open(chemin, "rb").read().decode("utf-8", errors="replace"))


def controle(nom: str, mesure, attendu, source: str = "section D312") -> None:
    global ecarts, controles
    controles += 1
    ok = mesure == attendu
    ecarts += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {nom} : mesuré {mesure!r} (attendu, {source} : {attendu!r})")


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8").stdout


def git_octets(*args: str) -> bytes:
    return subprocess.run(["git", *args], capture_output=True).stdout


def sha(chemin: str) -> str:
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def dans_l_ordre(fragments_section: str, reel: str) -> bool:
    """Le texte de la section élide par « … » : chaque morceau non vide doit se trouver dans le réel, dans l'ordre."""
    pos = 0
    for morceau in (m.strip() for m in fragments_section.split("…")):
        if not morceau:
            continue
        i = reel.find(morceau, pos)
        if i < 0:
            return False
        pos = i + len(morceau)
    return True


# ------------------------------------------------------------------ 1. provenance et périmètre
print("== 1. provenance et périmètre")
controle("parent de l'étape 0", git("rev-parse", "--short=7", f"{ETAPE0}^").strip(), DEPART)
controle("parent du commit final", git("rev-parse", "--short=7", f"{FIN}^").strip(), ETAPE0)
controle("« D312 » à SHA de départ (git grep, fichiers suivis)", len([l for l in git("grep", "-l", "D312", DEPART).splitlines() if l]), 0)
e0 = [l for l in git("diff", "--name-only", DEPART, ETAPE0).splitlines() if l]
controle("étape 0 : fichiers hors ZWADJ_CONTINUITE.md et docs/preuves/D312/", [f for f in e0 if f != "ZWADJ_CONTINUITE.md" and not f.startswith("docs/preuves/D312/")], [])
controle("étape 0 : le harnais n'est pas touché", HARNAIS in e0, False)
tout = [l for l in git("diff", "--name-only", DEPART, FIN).splitlines() if l]
permis = {"AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", HARNAIS}
controle("fichiers hors de la liste attendue", [f for f in tout if f not in permis and not f.startswith("docs/preuves/D312/")], [])
controle("fichiers de CODE (hors .md d'autorité et docs/preuves/)", [f for f in tout if f not in permis - {HARNAIS} and not f.startswith("docs/preuves/")], [HARNAIS])
controle("specs ou tests touchés", [f for f in tout if re.search(r"\.(spec|test|int-spec)\.", f)], [])
print(f"  · pièces suivies sous docs/preuves/D312/ : {len([l for l in git('ls-files', D).splitlines() if l])} — relevé, "
      "la section ne l'écrit pas : parcouru, pas un contrôle")

# ------------------------------------------------------------------ 2. CIBLES et ENV inchangées à l'octet
print("== 2. `ENV` et `CIBLES` INCHANGÉES À L'OCTET (MD-AOA-9)")


def blocs_ast(src_octets: bytes):
    src = src_octets.decode("utf-8")
    arbre = ast.parse(src)
    lignes = src_octets.split(b"\n")
    out = {}
    for n in arbre.body:
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and getattr(n.targets[0], "id", "") in ("ENV", "CIBLES"):
            nom = n.targets[0].id
            out[nom] = (ast.literal_eval(n.value), b"\n".join(lignes[n.lineno - 1:n.end_lineno]))
    return out


avant = blocs_ast(git_octets("show", f"{DEPART}:{HARNAIS}"))
apres_octets = git_octets("show", f"{FIN}:{HARNAIS}")
apres = blocs_ast(apres_octets)
controle("CIBLES : valeurs identiques (arbre syntaxique)", avant["CIBLES"][0] == apres["CIBLES"][0], True)
controle("CIBLES : nombre", len(apres["CIBLES"][0]), 13)
controle("CIBLES : octets du bloc identiques", avant["CIBLES"][1] == apres["CIBLES"][1], True)
controle("ENV : valeurs et octets identiques", (avant["ENV"][0] == apres["ENV"][0], avant["ENV"][1] == apres["ENV"][1]), (True, True))
controle("CIBLES : bloc présent une fois", len(re.findall(rb"^CIBLES = \[", apres_octets, re.M)), 1)
# ⚠ Les fins de ligne se comptent sur le fichier de l'ARBRE : `core.autocrlf=true` normalise le blob en LF, et le
#   compter rendrait « 456 LF nus » sur un fichier sain (défaut de la première version de cet instrument, rejouée).
arbre_octets = open(HARNAIS, "rb").read()
compte_lf = lambda o: (len(re.findall(rb"(?<!\r)\n", o)), len(re.findall(rb"\r(?!\n)", o)), o.count(b"\r\n"))
lf_blob = compte_lf(apres_octets)[0]
controle("calibration du compteur, bras positif : le blob (LF, autocrlf) rend des LF nus", lf_blob > 0, True, "cas connu")
print(f"  · blob : {lf_blob} LF nus sur {apres_octets.count(bytes([10]))} sauts de ligne")
lf_nus, cr_isoles, crlf = compte_lf(arbre_octets)
print(f"  · arbre : {len(arbre_octets)} octets, {crlf} CRLF parcourus")
controle("harnais dans l'arbre : LF nus", lf_nus, 0)
controle("harnais dans l'arbre : CR isolés (faute n° 4 de D312)", cr_isoles, 0)
diff = subprocess.run(["git", "diff", "--quiet", FIN, "--", HARNAIS]).returncode
controle("harnais dans l'arbre = harnais à FIN (git diff --quiet, statut vide)", (diff, git("status", "--porcelain", HARNAIS).strip()), (0, ""), "aucune retouche depuis")

# ------------------------------------------------------------------ 3. reproduction avant, sondes
print("== 3. défaut reproduit AVANT, sondes")
r = lire(f"{D}/avant/repro-aoa-13-sortie.txt")
a = re.findall(r"^\s*\S+\s+\(a\) code (\S+) en\s+[\d.]+ s", r, re.M)
b = re.findall(r"^\s*\S+\s+\(b\) code (\S+) en\s+[\d.]+ s", r, re.M)
controle("(a) : lignes, codes 1", (len(a), a.count("1")), (13, 13))
controle("(b) : lignes, codes 0", (len(b), b.count("0")), (13, 13))
m = re.search(r"tests PASSÉS relevés sur les lignes « Tests » : \(a\) (\d+) · \(b\) (\d+)", r)
controle("tests passés relevés (a), (b)", (int(m.group(1)), int(m.group(2))) if m else None, (0, 15))
s = lire(f"{D}/sondes/sondes-vitest-sortie.txt")
controle("version de vitest des sondes", re.search(r"version de vitest .*: (\S+)", s).group(1), "3.2.7")
for nom, code_att, tests_att in (("S1-nominal", "0", "Tests  3 passed | 22 skipped (25)"),
                                 ("S2-filtre-sans-titre", "0", "Tests  25 skipped (25)"),
                                 ("S3-fichier-introuvable", "1", None),
                                 ("S4-commande-introuvable", "1", None)):
    t = lire(f"{D}/sondes/{nom}.txt")
    code = re.search(r"--- code de sortie : (\S+) ---", t).group(1)
    tests = [l.strip() for l in t.splitlines() if l.strip().startswith("Tests ")]
    controle(f"{nom} : code, dernière ligne « Tests »", (code, tests[-1] if tests else None), (code_att, tests_att))

# ------------------------------------------------------------------ 4. le lancement « relu » dans trois harnais
print("== 4. lancement relu dans neutralize-s11a.py, -s11b.py, -rang23.py (pnpm --filter @zwadj/api exec vitest, sans cwd)")
for h in ("s11a", "s11b", "rang23"):
    t = open(f"neutralisation/neutralize-{h}.py", encoding="utf-8").read()
    forme = bool(re.search(r'"pnpm",\s*"--filter",\s*"@zwadj/api",\s*"exec",\s*"vitest",\s*"run"', t))
    controle(f"{h} : forme de lancement, `cwd=` présent", (forme, "cwd=" in t), (True, False))
t = apres_octets.decode("utf-8")
controle("harnais corrigé : même forme dans `mesure()`", bool(re.search(r'return \["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", fichier, "-t", filtre\]', t)), True)

# ------------------------------------------------------------------ 5. la passe versée (aoa-2) et ses 30 journaux
print("== 5. passe finale (aoa-2) et ses journaux")
controle("aoa-2.code", open(f"{D}/campagne/aoa-2.code").read().strip(), "0")
t2 = lire(f"{D}/campagne/aoa-2.txt")
controle("calibration", re.search(r"calibration : (\d+) bras sur (\d+)", t2).groups(), ("5", "5"))
controle("pré-vol : mesures démarrées et vertes", re.search(r"✓ Pré-vol : (\d+) mesure", t2).group(1), "12")
mord2 = [l for l in t2.splitlines() if l.startswith("✓ ") and "vol" not in l]
controle("lignes « ✓ » sans « vol » (ce que compte lancer-campagnes)", len(mord2), 13)
controle("résumé", re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", t2).groups(), ("13", "13"))
controle("aucune ligne « ✗ »", len([l for l in t2.splitlines() if l.startswith("✗ ")]), 0)
J = f"{D}/campagne/journaux-aoa-2"
noms = sorted(os.listdir(J))
controle("journaux versés", len(noms), 30)
disque = ".neutralisation-journaux/available-on-api"
if os.path.isdir(disque):
    ident = sum(os.path.isfile(f"{disque}/{n}") and sha(f"{disque}/{n}") == sha(f"{J}/{n}") for n in noms)
    controle("versés identiques par SHA-256 à la source sur disque", (ident, len(noms)), (30, 30))
else:
    print("  · source absente du disque : l'identité 30/30 n'est pas rejouable")
TABLE = {  # recopié de la table de la section D312 : (fins de titre, première ligne)
    "A1": (["HIER est refusé…", "une date passée : 400 AVAILABLE_ON_PAST…"], "AssertionError: promise resolved … instead of rejecting"),
    "A2": (["⚠ AUJOURD'HUI EST ACCEPTÉ (`<`, pas `<=`)…"], 'AssertionError: promise rejected "BadRequestException…" instead of resolving'),
    "A3": (["⚠ `PENDING` N'EST PAS CHARGÉ (D101)…"], "AssertionError: expected { in: [ 'PENDING', … ] } to deeply equal …"),
    "A4": (["⚠ LA FENÊTRE VA À +48 H…"], "AssertionError: expected 1780441200000 to be 1780527600000"),
    "A5": (["⚠ SITUATION B — salle sans AUCUN créneau…"], "AssertionError: expected undefined to deeply equal { some: … }"),
    "A6": (["⚠ LES SALLES NE SE CONTAMINENT PAS…"], "AssertionError: expected [ false, false ] to deeply equal [ false, true ]"),
    "A7": (["⚠ SINGLE_SLOT : la MÊME réservation ferme la journée…"], "AssertionError: expected [ true ] to deeply equal [ false ]"),
    "A8": (["⚠ ANNOTER N'EST PAS FILTRER…"], "AssertionError: expected [] to have a length of 1 but got +0"),
    "A9": (["⚠ ANNOTER N'EST PAS FILTRER…"], "AssertionError: expected null to be '2026-06-02'"),
    "A10": (["⚠ `computeDayAvailability` DÉLÈGUE…"], "AssertionError: expected '// Moteur de disponibilité…' to contain 'return computeDaySlotStatuses({'"),
    "B1": (["⚠ ROUTE INCONNUE : l'enveloppe automatique de Nest…"], "AssertionError: expected { …(3) } to deeply equal { code: 'ROUTE_NOT_FOUND', … }"),
    "B2": (["⚠ UN 404 MÉTIER N'EST PAS TOUCHÉ…"], "AssertionError: expected { code: 'ROUTE_NOT_FOUND', … } to deeply equal { code: 'VENUE_NOT_FOUND', … }"),
    "A13": (["⚠ SANS `availableOn`, AUCUNE exclusion…"], "AssertionError: expected { some: … } to be undefined"),
}
total_blocs, types, parcourues = 0, set(), 0
for cle, (fins, premiere) in TABLE.items():
    t = lire(f"{J}/{cle}.txt")
    lignes = t.splitlines()
    parcourues += len(lignes)
    blocs = []
    for i, l in enumerate(lignes):
        m = re.match(r"^\s*FAIL\s+\S+\s+>\s+(.+?)\s*$", l)
        if m:
            blocs.append((m.group(1), next((x.strip() for x in lignes[i + 1:i + 8] if x.strip()), "")))
    total_blocs += len(blocs)
    types |= {p.split(":")[0] for _, p in blocs}
    res = re.findall(r"^\s*Tests\s+(.+?)\s*$", t, re.M)
    echecs = int(re.search(r"(\d+) failed", res[-1]).group(1)) if res and "failed" in res[-1] else 0
    titres_ok = all(any(f.split("…")[0].strip() in ti for ti, _ in blocs) for f in fins)
    premieres_ok = all(dans_l_ordre(premiere, p) for _, p in blocs)
    controle(f"{cle} : blocs, en échec, fins de titre, première ligne", (len(blocs), echecs, titres_ok, premieres_ok),
             (len(fins) if cle == "A1" else 1, len(fins) if cle == "A1" else 1, True, True))
print(f"  · parcouru : 13 journaux de cible, {parcourues} lignes")
controle("blocs d'échec au total", total_blocs, 14)
controle("types d'erreur des blocs", sorted(types), ["AssertionError"])
t1 = lire(f"{D}/campagne/aoa-1.txt")
controle("aoa-1 : lignes « ✓ » sans « vol », résumé", (len([l for l in t1.splitlines() if l.startswith("✓ ") and "vol" not in l]),
                                                      re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", t1).groups()), (13, ("13", "13")))
lj = lire(f"{D}/campagne/lire-journaux-aoa-2.txt")
m = re.search(r"journaux lus : (\d+) .* lignes parcourues (\d+) · écarts (\d+)", lj)
controle("lecteur indépendant (versé) : journaux, lignes, écarts", m.groups() if m else None, ("30", "1554", "0"))
vm = lire(f"{D}/campagne/verifier-mutations.txt")
controle("verifier-mutations : posées, non posées", re.search(r"POSEES (\d+)\s+·\s+NON POSEES (\d+)", vm).groups(), ("13", "0"))

# ------------------------------------------------------------------ 6. gardes du harnais, neutralisées sur copies
print("== 6. méta-preuves")
mt = lire(f"{D}/meta/preuves-du-harnais-sortie.txt")
controle("variantes, écarts", re.search(r"variantes : (\d+) · écarts (\d+)", mt).groups(), ("6", "0"))
vv = re.findall(r"^✓ (V\d)-[\w-]+ : code (\d+) \(attendu (\d+)\)", mt, re.M)
controle("V0 à V5 : codes", [(v, c) for v, c, _ in vv], [("V0", "0"), ("V1", "2"), ("V2", "2"), ("V3", "2"), ("V4", "2"), ("V5", "2")])
controle("arbre après les variantes : lignes de statut", re.search(r"arbre après les variantes .*: (\d+) ligne", mt).group(1), "1")
v4 = lire(f"{D}/meta/V4-non-demarrage-sous-mutation.txt")
controle("V4 : « Tests no tests », NON DÉMARRÉE, 0 mordue, code 2",
         ("« Tests no tests »" in v4, "NON DÉMARRÉE — PAS une morsure" in v4, "0 garde(s) mordue(s)" in v4, "--- code de sortie : 2 ---" in v4),
         (True, True, True, True))
print("  · le point d'entrée écrit « chacune fait refuser le harnais (… 6 variantes sur 6) » : V0 est le TÉMOIN (code 0) — "
      "cinq refusent, le sixième est le bras qui prouve que les cinq refus ne sont pas un refus de tout (la section le dit)")

# ------------------------------------------------------------------ 7. portes
print("== 7. portes")
P = f"{D}/portes"
for nom in ("typecheck", "lint", "test", "build", "testint"):
    controle(f"{nom} code", open(f"{P}/{nom}.code").read().strip(), "0")
compte = lambda nom, motif: len([l for l in lire(f"{P}/{nom}.log").splitlines() if re.search(motif, l)])
controle("typecheck : « Done », error TS", (compte("typecheck", r"\bDone\b"), compte("typecheck", r"error TS")), (8, 0))
controle("lint : « Done »", compte("lint", r"\bDone\b"), 8)
controle("build : « Done »", compte("build", r"\bDone\b"), 4)
tt = lire(f"{P}/test.log")
paires = list(zip([int(x) for x in re.findall(r"Tests\s+(\d+) passed \(\d+\)", tt)],
                  [int(x) for x in re.findall(r"Test Files\s+(\d+) passed \(\d+\)", tt)]))
controle("test : Tests/Test Files par paquet", paires, [(664, 58), (36, 3), (287, 20), (347, 28)])
controle("test : somme", (sum(p[0] for p in paires), sum(p[1] for p in paires)), (1334, 109))
ti = lire(f"{P}/testint.log")
controle("test:int : Tests, Test Files", (re.findall(r"Tests\s+(\d+) passed", ti)[-1:], re.findall(r"Test Files\s+(\d+) passed", ti)[-1:]), (["443"], ["36"]))
controle("pg_isready avant test:int", "accepting connections" in lire(f"{P}/pg-avant-testint.txt"), True)
controle("« fail » (toute casse) : test, test:int", (compte("test", r"(?i)fail"), compte("testint", r"(?i)fail")), (2, 1))
controle("« fail » de test : ChargilyGateway", len([l for l in tt.splitlines() if re.search(r"(?i)fail", l) and "ChargilyGateway" in l]), 2)
lc = lire(f"{D}/campagne/lancer-campagnes.txt")
controle("lancer-campagnes : modifiés → concernées sur", re.search(r"(\d+) fichier\(s\) modifié\(s\) depuis HEAD → (\d+) campagne\(s\) concernée\(s\) sur (\d+)", lc).groups(), ("60", "0", "28"))
et = lire(f"{D}/etat/sonde-avant-harnais.txt")
champ = lambda cle: (re.search(rf"^{cle}=(\S+)", et, re.M) or [None, None])[1]
controle("état machine : alim, node, chrome", (champ("ALIM_SOURCE"), champ("NODE"), champ("CHROME")), ("SECTEUR", "0", "17"))

# ------------------------------------------------------------------ 8. passe D277
print("== 8. passe D277")
controle("balayage.py : SHA-256, et égal à celui de D311", (sha(f"{D}/passe-d277/balayage.py")[:8], sha(f"{D}/passe-d277/balayage.py") == sha("docs/preuves/D311/passe-d277/balayage.py")), ("24802faf", True))
mo = [l for l in open(f"{D}/passe-d277/motifs.txt", encoding="utf-8").read().splitlines() if l and not l.startswith("#")]
controle("motifs (hors témoins), témoins", (len([l for l in mo if l[0] in "12"]), len([l for l in mo if l.startswith("T")])), (8, 2))
for nom, att in (("balayage-1.txt", ("37", "0")), ("balayage-apres-ecriture.txt", ("40", "0"))):
    tb = lire(f"{D}/passe-d277/{nom}")
    controle(f"{nom} : occurrences, motifs à zéro", (re.search(r"OCCURRENCES DANS L'ARBRE : (\d+)", tb).group(1), re.search(r"MOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", tb).group(1)), att)

# ------------------------------------------------------------------ 9. annotations que D312 dit avoir posées
print("== 9. annotations et écritures de D312, relues dans les fichiers à FIN")
C = git("show", f"{FIN}:ZWADJ_CONTINUITE.md")
A = git("show", f"{FIN}:AGENTS.md")
B = git("show", f"{FIN}:ZWADJ_BACKLOG.md")
plat = lambda x: re.sub(r"\s+", " ", x)
Cp, Ap, Bp = plat(C), plat(A), plat(B)
controle("titre du point d'entrée : « LOT DE DÉBLOCAGE FAIT LE 26/09/2026 (D312) — COMPTEUR À TROIS »", "LOT DE DÉBLOCAGE FAIT LE 26/09/2026 (D312) — COMPTEUR À TROIS" in Cp, True)
controle("table : ligne « lot de déblocage » ✅ FAIT (D312)", "✅ **FAIT LE 26/09/2026 (D312)**" in C, True)
controle("ordre des rangs : ligne D312", "(D312, 26/09/2026) RANG 23 — LE LOT DE DÉBLOCAGE" in Cp, True)
controle("sous le rang 24 : annotation D312 (exception CONSOMMÉE)", "(D312, 26/09/2026 — passe D277, sens 2 : le lot de déblocage est **fait** ⇒ l'exception de Ko est **CONSOMMÉE**" in Cp, True)
controle("registre : ligne D312", bool(re.search(r"^\| D312 \| A \| D312 — ", C, re.M)), True)
controle("AGENTS.md : « exception CONSOMMÉE »", "(D312, 26/09/2026 : **exception CONSOMMÉE**" in Ap, True)
controle("AGENTS.md : règle « UNE MESURE QUI NE DÉMARRE PAS N'EST JAMAIS UNE MORSURE »", "UNE MESURE QUI NE DÉMARRE PAS N'EST JAMAIS UNE MORSURE" in Ap, True)
controle("backlog : entrée [OUTIL] d'available-on-api close", "- [x] **[OUTIL]** ⛔ **`neutralize-available-on-api.py` NE LANCE JAMAIS SA MESURE" in B, True)
controle("backlog : reports de D312", "## Reports du 26/09/2026 — rang 23, lot de déblocage (D312)" in B, True)
# Les harnais du chemin de l'argent à la date de D312 : les onze de la carte de D307 (tri.txt), plus s11a par la décision
# du relecteur de D311 (S11a-7 et S11a-11 DEDANS). Le report de D312 en écrit « onze ».
tri = open("docs/preuves/D307/carte/tri.txt", encoding="utf-8").read()
m = re.search(r"HARNAIS DU CHEMIN DE L'ARGENT À HEAD \w+, carte de D304 \+ ce tri : (.+?) — et (\w+) \(neuf", plat(tri))
onze = [x.strip() for x in m.group(1).split(",")] + [m.group(2)] if m else []
print(f"  · carte de D307, dernière section : {len(onze)} harnais — {', '.join(onze)}")
d311_s11a = "S11a-7 et S11a-11 **DEDANS**" in Cp
avec_s11a = len(onze) + (1 if d311_s11a and "s11a" not in onze else 0)
m = re.search(r"chemin de l'argent : non pour la règle, oui pour les (\w+) harnais qu'elle lit", Bp)
controle("backlog, report [MÉTHODE] de D312 : harnais du chemin de l'argent qu'il nomme",
         m.group(1) if m else None, {11: "onze", 12: "douze"}.get(avec_s11a),
         "DÉRIVÉ, pas recopié : les onze de la carte de D307 + s11a, dedans par D311")
m = re.search(r"`neutralize-available-on-api\.py` a compté « ROUGE », à chaque certification depuis le 30/08", Ap)
print(f"  · AGENTS.md (règle de D312) : « à chaque certification depuis le 30/08 » présent : {bool(m)} — confronté, section "
      "D310 : MESURÉ pour D293 et D299 (et D310), INFÉRÉ pour D275, D283, D288 ; D311 constat 1 : D288 mesuré sur des "
      "journaux dont l'attribution est inférée. ⇒ le fait est écrit au statut de mesure pour trois certifications où il "
      "ne l'est pas (D291) — constat, sans chiffre de la section")

# ------------------------------------------------------------------ 10. audit de secrets
print("== 10. audit de secrets et contrôles")
for nom, att in (("audit-secrets-d312.txt", ("1521", "1468", "53", "123")), ("audit-secrets-final.txt", None)):
    ta = lire(f"{D}/{nom}")
    m = re.search(r"parcourus : (\d+) fichiers.*?audités : (\d+) fichiers.*?exclus : (\d+) fichiers.*?alertes : (\d+)", ta)
    if att:
        controle(f"{nom} : parcourus, audités, exclus, alertes", m.groups(), att)
    else:
        print(f"  · {nom} : parcourus, audités, exclus, alertes = {m.groups()} (la section ne les chiffre pas : « dans sa sortie versée »)")
ctx = lambda nom: sorted(l.strip() for l in lire(f"{D}/{nom}").split("== CONTEXTE DES ALERTES")[1].splitlines() if l.strip().startswith("["))
c1, c2 = ctx("audit-secrets-d312.txt"), ctx("audit-secrets-final.txt")
controle("point 10 : le second audit rend les MÊMES alertes (contextes identiques)", (len(c1), len(c2), c1 == c2), (123, 123, True))
tr = lire(f"{D}/controles/tri-audit-d312.txt")
controle("tri : alertes absentes de la précédente", re.search(r"alertes ABSENTES de la précédente : (\d+)", tr).group(1), "1")
controle("tri : la neuve est à portes/testint.log", "[mot-de-passe] docs/preuves/D312/portes/testint.log" in tr, True)
ch = lire(f"{D}/controles/controle-forme-chargily-sortie.txt")
controle("contrôle de forme Chargily : parcourus, porteurs", re.search(r"parcourus : (\d+) fichiers.*porteurs : (\d+)", ch).groups(), ("77", "0"))

print(f"\n{controles} contrôles · {ecarts} écart(s) (attendu : ce que la lecture trouve — chaque ✗ se lit à son contexte)")
