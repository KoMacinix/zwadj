#!/usr/bin/env python3
"""Lecture adverse de la consigne « RANG 46 — les deux specs e2e sorties à cause de D265 reviennent dans la suite » contre le dépôt — D344.

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D344/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il ne lit que des OBJETS GIT à SHA fixe (SHA_DEPART = 5e932b3, l'état de DÉPART du lot) ; il n'écrit rien, sauf `--sortie` (UTF-8, LF, écrit par le
script lui-même : jamais par redirection du shell — D298). Les arguments de `git` sont passés en LISTE (D289) : aucun texte ne traverse un interpréteur.

POURQUOI IL EXISTE : la consigne affirme des faits (HEAD, compteur, numéros, existence des deux specs) et en SUPPOSE d'autres : que les deux specs
sont encore vraies contre l'application d'aujourd'hui (R-3 : « l'application a changé depuis le rang 30 et le rang 32 »). Le second est le cœur : pour
chaque libellé de message, chaque classe CSS et chaque identifiant que les specs ancrent, on cherche s'il existe encore dans les sources au SHA de départ.
Une ancre absente n'est PAS un verdict sur la spec (la source peut la fabriquer autrement) : c'est ce que la lecture signale avant qu'un rouge le fasse.

VERDICTS : ✓ vrai · ✗ faux (la règle d'arrêt joue) · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit, jamais tu) · ? non vérifiable
contre le dépôt (dit pourquoi). Chaque détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290), et l'ATTENDU à côté du mesuré.

INSTRUMENTS ÉCARTÉS : `docs/preuves/D343/lecture-adverse/confronter-consigne.py` — collé aux affirmations de D343 (signature de la panne, `keepAliveTimeout`).
Seuls ses PRINCIPES sont repris : texte APLATI avant toute recherche multi-mots (D277/D294), jamais de comptage par sous-chaîne sans contexte (D275).

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : pour CHAQUE sorte de contrôle — chemin de message, jeton CSS, ancêtre, motif
d'un fichier d'un SHA — un cas VRAI connu doit rendre « présent » et un cas FAUX connu « absent ».
"""
import json
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_DEPART = "5e932b3"
CONT, BACK, AGENTS = "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"
R30 = "docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts"
R32 = "docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts"
HARNAIS = "e2e/fixtures/harness.ts"
SOURCES = ["apps/pro/src", "packages/ui/src", "packages/ui/styles.css"]


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace").stdout


def rc(*args):
    return subprocess.run(["git", *args], capture_output=True).returncode


def blob(path, sha=SHA_DEPART):
    return git("show", f"{sha}:{path}")


def blob_octets(path, sha=SHA_DEPART):
    return subprocess.run(["git", "show", f"{sha}:{path}"], capture_output=True).stdout


def existe(path, sha=SHA_DEPART):
    return rc("cat-file", "-e", f"{sha}:{path}") == 0


def aplati(t):
    return re.sub(r"\s+", " ", t)


def ancetre(a, b):
    return rc("merge-base", "--is-ancestor", a, b) == 0


def chemin_message(arbre, chemin):
    n = arbre
    for part in chemin.split("."):
        if not isinstance(n, dict) or part not in n:
            return False
        n = n[part]
    return True


def jeton_dans_sources(jeton):
    """Le jeton (classe ou id, sans le point ni le dièse) apparaît-il dans une source NON de test au SHA de départ ? Rend (nombre de fichiers, premiers fichiers)."""
    sortie = git("grep", "-l", "-F", "-e", jeton, SHA_DEPART, "--", *SOURCES, ":(exclude)*.test.ts", ":(exclude)*.test.tsx")
    fichiers = [l.split(":", 1)[1] for l in sortie.splitlines() if ":" in l]
    return len(fichiers), fichiers[:2]


MESSAGES_FR = json.loads(blob("packages/i18n/messages/fr.json"))
MESSAGES_AR = json.loads(blob("packages/i18n/messages/ar.json"))

resultats = []


def controle(numero, affirmation, verdict, detail):
    resultats.append((numero, affirmation, verdict, detail))


# ─── CALIBRATION ───────────────────────────────────────────────────────────────────────────────
def calibrer():
    cas = [
        ("message vrai", chemin_message(MESSAGES_FR, "venue.ui.calendar.title"), True),
        ("message faux", chemin_message(MESSAGES_FR, "venue.ui.calendar.zz_d344_inexistant"), False),
        ("jeton vrai", jeton_dans_sources("wk-grand")[0] > 0, True),
        ("jeton faux", jeton_dans_sources("zz-d344-inexistant")[0] > 0, False),
        ("ancêtre vrai", ancetre(SHA_DEPART, "HEAD"), True),
        ("ancêtre faux", ancetre("HEAD", SHA_DEPART), False),
        ("motif vrai", bool(re.search(r"connection", blob(HARNAIS))), True),
        ("motif faux", bool(re.search(r"zz_d344_inexistant", blob(HARNAIS))), False),
    ]
    ko = [(n, obtenu, attendu) for n, obtenu, attendu in cas if obtenu != attendu]
    print(f"calibration : {len(cas)} cas joués, {len(ko)} manqué(s) (attendu 0)")
    if ko:
        print("✗ CALIBRATION MANQUÉE — l'instrument ne juge pas :", ko)
        sys.exit(2)


calibrer()

# ─── 1. L'ÉTAT DE DÉPART ───────────────────────────────────────────────────────────────────────
tete = git("rev-parse", "--short", SHA_DEPART).strip()
controle(1, f"le SHA de départ est 5e932b3 et résout ({tete})", "✓" if tete == "5e932b3" else "✗", f"rev-parse --short : {tete} (attendu 5e932b3)")

cont, back, agents = aplati(blob(CONT)), aplati(blob(BACK)), aplati(blob(AGENTS))
compteur = bool(re.search(r"compteur POUR MÉMOIRE \*\*QUATRE → DIX-HUIT\*\* .{0,200}\*\*→ DIX-NEUF\*\*", agents))
controle(2, "le compteur est DIX-NEUF à l'entrée (AGENTS.md, D343)", "✓" if compteur else "✗", f"texte aplati de AGENTS.md ({len(agents)} caractères) : motif « QUATRE → DIX-HUIT … → DIX-NEUF » {'présent' if compteur else 'ABSENT'}")

registre = re.findall(r"\| (D34\d) \| A \|", cont)
controle(3, "D342 et D343 sont au registre et D344 ne l'est pas", "✓" if ("D342" in registre and "D343" in registre and "D344" not in registre) else "✗", f"lignes de registre D34x relevées : {registre} (attendu D342, D343 ; pas D344)")

attente = "RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR" in cont
controle(4, "« RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR » est écrit dans l'ordre des rangs", "✓" if attente else "✗", f"{cont.count('RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR')} occurrence(s) dans {len(cont)} caractères aplatis")

# ─── 2. LES DEUX SPECS ─────────────────────────────────────────────────────────────────────────
for num, chemin, titre in [(5, R30, "r30"), (6, R32, "r32")]:
    ok = existe(chemin)
    controle(num, f"l'archive {titre} existe au SHA de départ", "✓" if ok else "✗", chemin)

o30, o32 = blob_octets(R30), blob_octets(R32)
controle(7, "les deux archives sont en CRLF (la copie doit l'être aussi)", "✓" if (b"\r\n" in o30 and b"\r\n" in o32) else "≈",
         f"r30 : {o30.count(b'\r\n')} CRLF / {o30.count(b'\n')} LF · r32 : {o32.count(b'\r\n')} CRLF / {o32.count(b'\n')} LF (sur octets)")

t30, t32 = blob(R30), blob(R32)
imports30 = re.findall(r'from "(\.[^"]+)"', t30)
imports32 = re.findall(r'from "(\.[^"]+)"', t32)
import posixpath


def resolu(import_relatif, depuis):
    """Le chemin de dépôt que vise l'import, depuis le dossier `depuis`, avec l'extension .ts essayée si le fichier nu n'existe pas."""
    base = posixpath.normpath(posixpath.join(depuis, import_relatif))
    for candidat in (base, base + ".ts"):
        if existe(candidat):
            return candidat
    return None


r30_resolus = [resolu(i, "e2e/specs") for i in imports30]
controle(8, "r30 porte DÉJÀ les chemins d'import de la suite (copie identique à l'octet attendue)", "✓" if all(r30_resolus) else "≈",
         f"imports de r30 ({len(imports30)}) résolus depuis e2e/specs/ : {list(zip(imports30, r30_resolus))} (attendu : tous résolus)")
dossier_r32 = posixpath.dirname(R32)
r32_depuis_archive = [resolu(i, dossier_r32) for i in imports32]
r32_depuis_suite = [resolu(i, "e2e/specs") for i in imports32]
controle(9, "r32 porte les chemins d'import de l'ARCHIVE (quatre à réécrire à la copie : résolus depuis l'archive, NON résolus depuis la suite)",
         "✓" if (len(imports32) == 4 and all(r32_depuis_archive) and not any(r32_depuis_suite)) else "≈",
         f"imports de r32 ({len(imports32)}) : depuis l'archive {sum(1 for r in r32_depuis_archive if r)} résolu(s), depuis e2e/specs/ {sum(1 for r in r32_depuis_suite if r)} résolu(s) (attendu 4 et 0)")

n30 = len(re.findall(r"^test\(", t30, flags=re.M))
n32 = len(re.findall(r"^test\(", t32, flags=re.M))
controle(10, "r30 = 1 test, r32 = 5 tests (la suite passera de 78 à 84 si les deux reviennent)", "✓" if (n30, n32) == (1, 5) else "≈", f"tests relevés : r30 {n30}, r32 {n32} (attendu 1 et 5) ; 78 + {n30 + n32} = {78 + n30 + n32}")

# ─── 3. LE HARNAIS QUE LES DEUX SPECS TRAVERSENT ───────────────────────────────────────────────
harnais = blob(HARNAIS)
importes = set()
for t in (t30, t32):
    for m in re.finditer(r"import \{([^}]+)\} from \"[^\"]*fixtures/harness\"", t):
        importes |= {x.strip() for x in m.group(1).split(",")}
manquants = [nom for nom in sorted(importes) if not re.search(rf"export (async )?(function|const) {nom}\b", harnais)]
controle(11, "tout ce que les specs importent du harnais y est exporté", "✓" if not manquants else "✗", f"{len(importes)} nom(s) importé(s) {sorted(importes)} ; manquants : {manquants} (attendu aucun)")
controle(12, "la réparation de D343 est en place (connection: close, un appel commun)", "✓" if ("appelHttp" in harnais and "close" in harnais) else "✗", f"harness.ts : appelHttp {'présent' if 'appelHttp' in harnais else 'ABSENT'}, « close » {'présent' if 'close' in harnais else 'ABSENT'}")

# ─── 4. LES ANCRES : CE QUE R-3 APPELLE « PÉRIMÉ » ─────────────────────────────────────────────
# 4.1 les chemins de messages. W = fr.venue.ui.walkin, WA = ar.venue.ui.walkin, PHONE = fr.common.phone, PHONE_AR = ar.common.phone ; plus les accès directs fr.… / ar.…
alias = {"W": ("fr", "venue.ui.walkin"), "WA": ("ar", "venue.ui.walkin"), "PHONE": ("fr", "common.phone"), "PHONE_AR": ("ar", "common.phone")}
vus, absents = set(), []
for t in (t30, t32):
    for m in re.finditer(r"\b(W|WA|PHONE_AR|PHONE)\.([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)", t):
        langue, base = alias[m.group(1)]
        vus.add((langue, f"{base}.{m.group(2)}"))
    for m in re.finditer(r"\b(fr|ar)\.((?:[A-Za-z_]\w*)(?:\.[A-Za-z_]\w*)+)", t):
        vus.add((m.group(1), m.group(2)))
for langue, chemin in sorted(vus):
    if not chemin_message(MESSAGES_FR if langue == "fr" else MESSAGES_AR, chemin):
        absents.append(f"{langue}:{chemin}")
controle(13, "chaque chemin de message que les specs lisent existe encore (fr et ar)", "✓" if not absents else "✗", f"{len(vus)} chemin(s) distincts relevés dans les deux specs ; absents : {absents} (attendu aucun)")

# 4.2 les classes CSS et identifiants des localisateurs
jetons = set()
for t in (t30, t32):
    for m in re.finditer(r"(?:locator|\.filter\(\{ has: page\.locator)\(\s*[\"'`]([^\"'`]+)[\"'`]", t):
        for c in re.findall(r"\.([A-Za-z][\w-]*)", m.group(1)):
            jetons.add(("classe", c))
        for i in re.findall(r"#([A-Za-z][\w-]*)", m.group(1)):
            jetons.add(("id", i))
    for c in re.findall(r"querySelector\(\"\.([A-Za-z][\w-]*)\"\)", t):
        jetons.add(("classe", c))
    for c in re.findall(r'"\.([A-Za-z][\w-]*) \{', t):
        jetons.add(("classe", c))
absents_css = []
details = []
for genre, jeton in sorted(jetons):
    n, ex = jeton_dans_sources(jeton)
    details.append(f"{genre} {jeton}:{n}")
    if n == 0:
        absents_css.append(f"{genre} {jeton}")
controle(14, "chaque classe CSS et identifiant que les localisateurs ancrent existe encore dans les sources (hors tests)", "✓" if not absents_css else "✗",
         f"{len(jetons)} jeton(s) distincts parcourus dans {len(SOURCES)} racines ; absents : {absents_css} (attendu aucun) ; fichiers par jeton : {', '.join(details)}")

# 4.3 les noms de rôle à NOM ACCESSIBLE : le lien du calendrier
lien = "CALENDAR_PATH" in blob("apps/pro/src/venues/edit-venue-page.tsx") and blob("apps/pro/src/routes.ts").count('CALENDAR_PATH = "/calendrier"') == 1
controle(15, "le lien de l'assistant mène à CALENDAR_PATH = « /calendrier » (l'adresse que r30 attend)", "✓" if lien else "✗", "edit-venue-page.tsx utilise CALENDAR_PATH ; routes.ts : CALENDAR_PATH = \"/calendrier\"")

# ─── 5. CE QUE LA SPEC ANNONCE ELLE-MÊME ───────────────────────────────────────────────────────
theme = blob("apps/pro/src/theme.css")
double = len(re.findall(r"\.pro-layout\s*\{[^}]*grid-template-columns:\s*292px", theme))
controle(16, "le défaut antérieur noté par r32 (grille .pro-layout à 360 px) : la spec le NEUTRALISE si présent et passe sans changer s'il est réparé", "≈",
         f"theme.css : {double} déclaration(s) .pro-layout avec 292px au SHA de départ ; la spec lit `colonnesAvant` et ne neutralise que si > 1 — les deux états la font passer (lu dans le texte de la spec, pas mesuré ici)")

warm = blob("e2e/specs/warmup.setup.ts")
controle(17, "r30 visite `/calendrier` ; le préchauffage le couvre-t-il ?", "≈" if "/calendrier" not in warm else "✓",
         f"warmup.setup.ts : « ${{PRO}}/calendrier » {'présent' if '/calendrier' in warm else 'ABSENT'} — une route non préchauffée est compilée par la première demande (D127) ; mesuré à l'exécution, pas ici")

# ─── 6. LES RÉFÉRENCES QUE LA CONSIGNE CITE ────────────────────────────────────────────────────
refs = [
    ("D295 « une archive ne se retouche pas »", agents, r"D295"),
    ("D304 « première ligne du bloc d'échec »", agents, r"première ligne du bloc"),
    ("R-9 de D340 « sur batterie, aucune porte »", agents, r"R-9"),
    ("R-15 de D343 « un seul rouge ⇒ arrêt »", cont, r"R-15"),
    ("L36-4 « les écrans du personnel »", cont, r"L36-4"),
    ("S-104 « mot de passe expiré »", cont, r"S-104"),
    ("l'arbitrage de Ko du 05/10/2026 sur le rang 32 (« RATIFIÉE par Ko »)", agents, r"RATIFIÉE par Ko"),
]
for i, (nom, texte, motif) in enumerate(refs, start=18):
    n = len(re.findall(motif, texte))
    controle(i, f"référence présente : {nom}", "✓" if n else "✗", f"motif « {motif} » : {n} occurrence(s) dans {len(texte)} caractères aplatis")

fc5 = len(re.findall(r"\bFC-5\b", cont)) + len(re.findall(r"\bFC-5\b", blob("docs/preuves/front-client/BILAN.md")))
fc8 = len(re.findall(r"\bFC-8\b", cont))
controle(25, "FC-5 et FC-8 de front-client sont dans l'historique (la consigne les cite comme causes de changement)", "✓" if (fc5 and fc8) else "≈", f"FC-5 : {fc5} occurrence(s), FC-8 : {fc8} occurrence(s) — ils touchent le CLIENT public ; les deux specs jouent surtout l'app PRO (lu, pas mesuré : voir contrôle 26)")

pro_touche = git("log", "--format=%h", "-n", "40", SHA_DEPART, "--", "apps/pro/src").split()
controle(26, "l'app Pro a changé depuis les rangs 30 et 32 (la consigne le suppose)", "✓" if pro_touche else "≈", f"commits touchant apps/pro/src parmi les 40 derniers de ce chemin : {len(pro_touche)} ; le plus récent : {pro_touche[0] if pro_touche else '—'}")

# ─── RAPPORT ───────────────────────────────────────────────────────────────────────────────────
lignes = []
compte = {"✓": 0, "≈": 0, "✗": 0, "?": 0}
for numero, affirmation, verdict, detail in resultats:
    compte[verdict] += 1
    lignes.append(f"{numero:>2}. [{verdict}] {affirmation}\n      {detail}")
lignes.append("")
lignes.append(f"BILAN : {len(resultats)} contrôles · {compte['✓']} ✓ · {compte['≈']} ≈ · {compte['✗']} ✗ · {compte['?']} ?   (attendu : 0 ✗ ; chaque ≈ est lu et écrit, jamais tu)")
texte = "\n".join(lignes) + "\n"
print(texte)
if "--sortie" in sys.argv:
    chemin = sys.argv[sys.argv.index("--sortie") + 1]
    with open(chemin, "w", encoding="utf-8", newline="\n") as f:
        f.write(texte)
sys.exit(1 if compte["✗"] else 0)
