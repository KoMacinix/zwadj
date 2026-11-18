#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 53 — l'intégration de la branche `par-carte` dans `main` — et du BILAN de la branche, contre le dépôt — D351.

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D351/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il lit des OBJETS GIT à SHA fixe (SHA_BASE = 5951b2c, l'état de DÉPART du lot ; SHA_BR = 7fdc679, la pointe de `par-carte` ; MB = 26ad5c7, la
base commune) et trois choses du disque : `git status` (lecture seule), l'état de l'arbre de travail pour la cible H6 (le fichier visé tel qu'il est
sur ce poste, CRLF), et la liste des harnais `neutralisation/neutralize-*.py`. `--sortie` écrit UTF-8, LF, par le script lui-même (jamais par
redirection du shell — D298). Aucun texte ne traverse un interpréteur : les arguments de `git` sont passés en LISTE (D289).

POURQUOI IL EXISTE : la consigne demande une lecture adverse « de cette consigne et du BILAN contre le dépôt avant tout .md d'autorité » (§ 3).
Chaque affirmation VÉRIFIABLE est un contrôle qui rend (verdict, détail) ; le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

VERDICTS : ✓ vrai · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit, jamais tu) · ✗ FAUX (l'affirmation est contredite par le
dépôt ; la règle d'arrêt de la consigne ne vise que les points du § 0 — un ✗ ailleurs se rapporte et se traite, il n'arrête pas la fusion) · ?
non vérifiable contre le dépôt (dit pourquoi).

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D342/lecture-adverse/confronter-consigne.py` — collé aux affirmations de D342 (SHA, noms, lots). Seuls
les PRINCIPES sont repris : texte APLATI avant toute recherche multi-mots (AGENTS.md, D277/D294), jamais de comptage par sous-chaîne sans contexte
(D275), le compte de ce qui a été parcouru à côté du total (D290), la calibration à deux bras (D286).

CALIBRATION (D286, ABANDON si un cas manque son verdict) : pour CHAQUE sorte de contrôle employée — ligne du registre, motif cherché dans un fichier
d'un SHA, ancêtre, existence d'un chemin, compte d'un diff, comptage de clés d'un JSON — un cas VRAI connu doit rendre « présent » et un cas FAUX connu
« absent ». Sans cela, « 0 occurrence » serait vrai de n'importe quel motif.
"""
import json
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "5951b2c"
SHA_BR = "7fdc679"
MB = "26ad5c7"
ARBRE_FUSION_ATTENDU = "9c12458f5ae5af484ce0d58c6c47b7e0badcc95d"

CONT = "ZWADJ_CONTINUITE.md"
BACK = "ZWADJ_BACKLOG.md"
AGENTS = "AGENTS.md"
BILAN = "docs/preuves/parallele/carte/BILAN.md"
ABL = "docs/preuves/parallele/carte/a-reporter-au-backlog.md"
TIERS = "docs/preuves/parallele/carte/ce-qui-part-vers-le-tiers.md"
ARABE = "docs/preuves/parallele/carte/arabe-a-relire.md"
SERVICE = "apps/api/src/venues/venues-public.service.ts"
API_TS = "apps/client/src/lib/api.ts"
FR = "packages/i18n/messages/fr.json"
AR = "packages/i18n/messages/ar.json"
PARITE = "apps/api/src/common/i18n-parity.spec.ts"
ADM2_JOURNAL = "docs/preuves/D350/neutralisation/campagne-adm2-passe-3.txt"
CONSIGNE_REPO = "docs/preuves/D351/consigne.md"


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace").stdout


def rc(*args):
    return subprocess.run(["git", *args], capture_output=True).returncode


def blob(sha, path):
    return git("show", f"{sha}:{path}")


def existe(sha, path):
    return rc("cat-file", "-e", f"{sha}:{path}") == 0


def aplati(t):
    return re.sub(r"\s+", " ", t)


def trouve(t, motif):
    return list(re.finditer(motif, t))


def ctx(t, m, avant=60, apres=200):
    return t[max(0, m.start() - avant): m.end() + apres]


def ancetre(a, b):
    return rc("merge-base", "--is-ancestor", a, b) == 0


def diff_trois_points():
    return [l for l in git("diff", "--name-only", f"{SHA_BASE}...{SHA_BR}").splitlines() if l.strip()]


def cles_plat(texte_json):
    out = {}

    def rec(t, p=""):
        for k, val in t.items():
            q = k if not p else f"{p}.{k}"
            if isinstance(val, dict):
                rec(val, q)
            else:
                out[q] = val

    rec(json.loads(texte_json))
    return out


# ───────────────────────── TEXTES LUS (une seule fois) ─────────────────────────
TEXTES = {CONT: aplati(blob(SHA_BASE, CONT)), BACK: aplati(blob(SHA_BASE, BACK)), AGENTS: aplati(blob(SHA_BASE, AGENTS))}
B = aplati(blob(SHA_BR, BILAN))
BRUT_BILAN = blob(SHA_BR, BILAN)
A = aplati(blob(SHA_BR, ABL))
CONSIGNE = aplati(open(CONSIGNE_REPO, encoding="utf-8").read())
LU = {CONT: len(TEXTES[CONT]), BACK: len(TEXTES[BACK]), AGENTS: len(TEXTES[AGENTS]), BILAN: len(B), ABL: len(A), CONSIGNE_REPO: len(CONSIGNE)}

# ───────────────────────── CALIBRATION, DEUX BRAS ─────────────────────────
cal = []


def calibre(nom, positif, negatif):
    ok = (positif is True) and (negatif is False)
    cal.append((nom, positif, negatif, ok))
    if not ok:
        sys.exit(f"CALIBRATION RATÉE — {nom} : cas vrai → {positif} (attendu True), cas faux → {negatif} (attendu False). ABANDON, rien n'a été jugé.")


calibre("ligne du registre (D350 présente, D999 absente)", len(trouve(TEXTES[CONT], r"\| D350 \| A \| D350 —")) == 1, len(trouve(TEXTES[CONT], r"\| D999 \| A \| D999 —")) > 0)
calibre("motif dans un fichier d'un SHA (RANG 53 en attente présent, RANG 99 absent)", len(trouve(TEXTES[CONT], r"RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR")) > 0, len(trouve(TEXTES[CONT], r"RANG 99 : EN ATTENTE DE CADRAGE DU RELECTEUR")) > 0)
calibre("ancêtre (le premier commit de la branche l'est, main ne l'est pas)", ancetre("d51826c", SHA_BR), ancetre(SHA_BASE, SHA_BR))
calibre("existence d'un chemin à un SHA (AGENTS.md oui, un harnais inventé non)", existe(SHA_BASE, AGENTS), existe(SHA_BASE, "neutralisation/neutralize-zzz-inexistant.py"))
calibre("motif du compteur dans AGENTS (« VINGT-CINQ → VINGT-SIX » présent, « VINGT-SIX → TRENTE-DEUX » pas encore écrit)", len(trouve(TEXTES[AGENTS], r"VINGT-CINQ → VINGT-SIX")) >= 1, len(trouve(TEXTES[AGENTS], r"VINGT-SIX → TRENTE-DEUX")) > 0)
vide = [l for l in git("diff", "--name-only", SHA_BASE, SHA_BASE).splitlines() if l.strip()]
calibre("compte d'un diff (la fusion apporte des fichiers, deux SHA identiques n'en apportent aucun)", len(diff_trois_points()) > 0, len(vide) > 0)
cp = cles_plat('{"a": {"b": "x", "c": {"d": "y"}}, "e": "z"}')
calibre("comptage de clés d'un JSON (trois feuilles comptées, une quatrième non)", len(cp) == 3, len(cp) == 4)

R = []


def v(ident, enonce, verdict, detail):
    R.append((ident, enonce, verdict, detail))


# ───────────────────────── 0. LA REPRISE (consigne § 0) ─────────────────────────
om = git("rev-parse", "origin/main").strip()
v("0.1", "origin/main = 5951b2c", "✓" if om.startswith("5951b2c") else "✗", f"origin/main = {om}")
opc = git("rev-parse", "origin/par-carte").strip()
v("0.2", "origin/par-carte = 7fdc679", "✓" if opc.startswith("7fdc679") else "✗", f"origin/par-carte = {opc}")
branche = git("branch", "--show-current").strip()
stash = [l for l in git("stash", "list").splitlines() if l.strip()]
statut = [l for l in git("status", "--short").splitlines() if l.strip()]
hors_lot = [l for l in statut if "docs/preuves/D351/" not in l]
v("0.3", "arbre propre, sans stash, sur `main`", "✓" if (branche == "main" and not stash and not hors_lot) else "✗",
  f"branche = {branche} ; stash = {len(stash)} ligne(s) ; `git status --short` = {len(statut)} ligne(s), dont {len(hors_lot)} hors `docs/preuves/D351/` (les pièces de CE lot sont attendues)")
m = trouve(TEXTES[CONT], r"RANG 52 : CLOS SUR LE CODE")
v("0.4", "rang 52 CLOS (D350)", "✓" if m else "✗", f"{len(m)} occurrence(s) de « RANG 52 : CLOS SUR LE CODE » dans {CONT} à {SHA_BASE}")
m = trouve(TEXTES[AGENTS], r"VINGT-CINQ → VINGT-SIX")
v("0.5", "compteur POUR MÉMOIRE VINGT-SIX", "✓" if m else "✗", f"{len(m)} occurrence(s) de « VINGT-CINQ → VINGT-SIX » dans {AGENTS} ; contexte : …{ctx(TEXTES[AGENTS], m[0], 80, 60) if m else '—'}…")
m = trouve(TEXTES[CONT], r"RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR\.\*\*[^⇒]{0,400}l'intégration de la branche `par-carte`")
v("0.6", "« RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat : l'intégration de par-carte)", "✓" if m else "✗", f"{len(m)} occurrence(s) du pointeur avec son candidat")
regs = re.findall(r"^\| (D\d+) \| ", blob(SHA_BASE, CONT), re.M)
d351 = {f: len(trouve(TEXTES[f], r"D351")) for f in (CONT, BACK, AGENTS)}
d351_cl = len([l for l in git("grep", "-l", "D351", SHA_BASE).splitlines()])
v("0.7", "numéro attendu D351, pris en lisant le registre", "✓" if (regs and regs[-1] == "D350" and sum(d351.values()) == 0 and d351_cl == 0) else "✗",
  f"{len(regs)} lignes `| Dnnn |` parcourues, dernière = {regs[-1] if regs else '—'} ; occurrences de D351 : {d351} ; fichiers de {SHA_BASE} qui le portent (`git grep -l`) : {d351_cl}")
v("0.8", "BILAN.md et a-reporter-au-backlog.md existent SUR LA BRANCHE", "✓" if (existe(SHA_BR, BILAN) and existe(SHA_BR, ABL)) else "✗", f"BILAN {len(BRUT_BILAN.splitlines())} lignes ; a-reporter {len(blob(SHA_BR, ABL).splitlines())} lignes")
m = trouve(TEXTES[CONT], r"R-5\. Compteur pour mémoire : les quatorze lots de code de la branche comptent")
v("0.9", "la section D342 (précédent d'intégration) porte R-1 à R-5", "✓" if (m and len(trouve(TEXTES[CONT], r"- R-1\. L'intégration passe avant L36-3a-2")) == 1) else "✗", f"R-5 de D342 : {len(m)} occurrence(s)")

# ───────────────────────── 1. CE QUE KO ADOPTE (consigne § 1) ─────────────────────────
lots = re.findall(r"^\| (CA-\d) \|", BRUT_BILAN, re.M)
v("1a.1", "six lots CA-1 à CA-6, du 13 au 14/11/2026", "✓" if (lots == [f"CA-{i}" for i in range(1, 7)] and "Du 13 au 14/11/2026" in B) else "✗", f"lots lus dans le tableau du BILAN § 1 : {lots} ; « Du 13 au 14/11/2026 » présent : {'Du 13 au 14/11/2026' in B}")
n_commits = len([l for l in git("rev-list", f"{SHA_BASE}..{SHA_BR}").splitlines() if l.strip()])
v("1a.2", "compteur VINGT-SIX → TRENTE-DEUX = 26 + 6", "✓" if 26 + 6 == 32 else "✗", f"26 + 6 = {26 + 6} ; commits de la branche absents de main : {n_commits} (= 6 lots × 3 commits — table, rouges, code — + l'extension de CA-6 + le commit d'ouverture + le commit du contrôle de fin : 18 + 3)")
m = trouve(TEXTES[CONT], r"R-5 de D342|R-5\. Compteur pour mémoire")
v("1a.3", "« les six lots de code de la branche comptent (R-5 de D342) »", "✓" if m else "✗", f"{len(m)} occurrence(s) de la règle R-5 de D342 dans {CONT}")
sec6 = re.search(r"## 6\..*?(?=\n## 7\.)", BRUT_BILAN, re.S)
items6 = re.findall(r"^(\d+)\. ", sec6.group(0), re.M) if sec6 else []
i20 = re.search(r"^20\. (.*)$", sec6.group(0), re.M) if sec6 else None
v("1b.1", "BILAN § 6, n° 1 à 22 ; le n° 20 est le titre de l'accueil « Carte des salles · Alger »", "✓" if (len(items6) == 22 and i20 and "Carte des salles · Alger" in i20.group(1)) else "✗", f"{len(items6)} entrées numérotées lues dans § 6 ; n° 20 : {i20.group(1)[:90] if i20 else '—'}")
fr_br = cles_plat(blob(SHA_BR, FR))
v("1b.2", "le titre de l'accueil vaut « Carte des salles · Alger » (clé `home.map.title`)", "✓" if fr_br.get("home.map.title") == "Carte des salles · Alger" else "✗", f"`home.map.title` à {SHA_BR} = {fr_br.get('home.map.title')!r} ({len(fr_br)} clés FR parcourues)")
sec5 = re.search(r"### 5\. Décisions prises par la session seule.*?(?=\n### 6\.)", blob(SHA_BASE, CONT), re.S)
s5 = re.findall(r"^- \*\*S-(\d+)\*\*", sec5.group(0), re.M) if sec5 else []
v("1c.1", "S-192 à S-204 existent (D350, § 5) : S-193 à S-204 ratifiées, S-192 refusée", "✓" if (s5 and s5[0] == "192" and s5[-1] == "204" and len(s5) == 13) else "✗", f"{len(s5)} décisions lues dans la section : {s5[:1]} … {s5[-1:]} ; S-192 = « {re.search(r'S-192\*\* — (.{0,110})', sec5.group(0)).group(1) if sec5 else '—'} … »")
m = trouve(TEXTES[AGENTS], r"sous une lecture fermée, un verdict s'écrit en assertion native")
v("1c.2", "AGENTS.md (D304, D316) : « sous une lecture fermée, un verdict s'écrit en assertion native »", "✓" if m else "✗", f"{len(m)} occurrence(s) dans {AGENTS}")
m25 = trouve(TEXTES[AGENTS], r"Neuf gardes de ce lot ne rougissaient que par un matcher jest-dom")
m45 = trouve(TEXTES[CONT], r"ils ont reçu une assertion native AVANT toute requête")
v("1c.3", "précédents D325 (neuf gardes) et D345 (deux gardes) : une garde lue par requête reçoit une assertion native", "✓" if (m25 and m45) else "✗", f"D325 dans AGENTS : {len(m25)} occurrence(s) ; D345 dans {CONT} : {len(m45)} occurrence(s)")
adm2 = blob(SHA_BASE, ADM2_JOURNAL)
m = re.search(r"dont (\d+) lue\(s\) en ERREUR DE REQUÊTE Testing Library", adm2)
v("1c.4", "« les 29 gardes de neutralize-adm2.py concernées »", "✓" if (m and m.group(1) == "29") else "✗", f"journal de la passe 3 de D350 ({len(adm2.splitlines())} lignes) : « dont {m.group(1) if m else '—'} lue(s) en ERREUR DE REQUÊTE Testing Library »")
m = trouve(TEXTES[CONT], r"un pro qui regarde la liste lit « en attente » pour une salle refusée")
v("1d", "réponse de Ko à la question de D350 : la liste « Mes salles » doit dire « Refusée »", "≈", f"la PREMISSE est dans {CONT} ({len(m)} occurrence(s) : S-193 « la liste garde son badge En attente ») ; **la question posée à Ko et sa réponse ne sont dans aucun fichier du dépôt** (elles vivent dans le chat) — non vérifiables ici, adoptées par adoption de la consigne")
tiles = blob(SHA_BR, "packages/ui/src/map/map-tiles.ts")
v("1e", "en développement la carte prend le défaut OpenStreetMap de `resolveMapTiles`", "✓" if ("resolveMapTiles" in tiles and "DEV_MAP_TILES" in tiles and "openstreetmap" in tiles) else "✗", f"`packages/ui/src/map/map-tiles.ts` à {SHA_BR} ({len(tiles.splitlines())} lignes) : resolveMapTiles={'resolveMapTiles' in tiles}, DEV_MAP_TILES={'DEV_MAP_TILES' in tiles}, openstreetmap={'openstreetmap' in tiles}")

# ───────────────────────── 2. DÉCISIONS DU RELECTEUR (R-1 à R-9) ─────────────────────────
mt = subprocess.run(["git", "merge-tree", "--write-tree", SHA_BASE, SHA_BR], capture_output=True, encoding="utf-8", errors="replace")
arbre = mt.stdout.strip().splitlines()[0] if mt.stdout.strip() else ""
v("R-1.a", "`git merge-tree --write-tree origin/main origin/par-carte` sort en 0, aucun conflit", "✓" if (mt.returncode == 0 and arbre == ARBRE_FUSION_ATTENDU) else "✗", f"code de sortie {mt.returncode}, arbre rendu {arbre} (attendu {ARBRE_FUSION_ATTENDU}), {len(mt.stdout.strip().splitlines())} ligne(s) de sortie (1 = pas de conflit)")
gauche = set(l for l in git("diff", "--name-only", MB, SHA_BASE).splitlines() if l.strip())
droite = set(l for l in git("diff", "--name-only", MB, SHA_BR).splitlines() if l.strip())
deux = sorted(gauche & droite)
v("R-1.b", "seuls fichiers touchés des deux côtés : api.ts, fr.json, ar.json", "✓" if deux == sorted([API_TS, FR, AR]) else "✗", f"{len(gauche)} fichier(s) côté main, {len(droite)} côté branche depuis {MB} ; intersection = {deux}")
d_api = git("diff", MB, SHA_BR, "--", API_TS)
ajoutes = [l for l in d_api.splitlines() if l.startswith(("+", "-")) and not l.startswith(("+++", "---"))]
touche = [l for l in ajoutes if re.search(r"getVenueBySlug|revalidate|no-store", l) and not l.startswith("+ ") and "getVenueMap" not in l]
api_main = blob(SHA_BASE, API_TS)
slug = re.search(r"export async function getVenueBySlug.*?\n}\n", api_main, re.S)
v("R-1.c", "api.ts : D348 (getVenueBySlug en no-store) ; la carte : une fonction neuve, autre zone", "✓" if (slug and 'cache: "no-store"' in slug.group(0) and "export async function getVenueMap" in blob(SHA_BR, API_TS) and not [l for l in ajoutes if l.startswith("-")]) else "✗",
  f"getVenueBySlug à main contient `cache: \"no-store\"` : {bool(slug and 'cache: \"no-store\"' in slug.group(0))} ; le diff de la branche sur ce fichier : {len(ajoutes)} ligne(s) changée(s), dont {len([l for l in ajoutes if l.startswith('-')])} retirée(s)")
v("R-2.a", "la réserve du BILAN § 2 : `test:int` rouge dans le conteneur cloud (deux fichiers, ECONNRESET, PostgreSQL 16, sans Docker)", "?", f"les DEUX fichiers sont nommés dans le BILAN ({len(trouve(B, r'pro-clients.int-spec.ts'))}, {len(trouve(B, r'quote-numbering.int-spec.ts'))} occurrence(s)) ; le rouge du conteneur n'est pas rejouable ici (il tient à l'environnement du conteneur) — c'est ce que les portes de ce lot mesurent sur le poste de Ko")
pk = json.loads(blob(SHA_BR, "packages/ui/package.json"))
dep = pk.get("dependencies", {})
dev = pk.get("devDependencies", {})
v("R-2.b", "dépendance neuve : leaflet 1.9.4, @types/leaflet", "✓" if (dep.get("leaflet") == "1.9.4" and "@types/leaflet" in {**dep, **dev}) else "✗", f"packages/ui/package.json à {SHA_BR} : leaflet = {dep.get('leaflet')!r} ; @types/leaflet = {({**dep, **dev}).get('@types/leaflet')!r}")
r15 = re.search(r"R-15\. LA PROUVE|R-15\. LA PREUVE : .{0,520}", TEXTES[CONT])
c_r2 = trouve(CONSIGNE, r"rejeu UNIQUE")
v("R-2.c", "R-2 : « deux passes e2e vertes de suite, règle commitée avant (R-15 de D343) » ET « un rouge sur un fichier que la fusion ne touche pas : rejeu UNIQUE »", "≈" if (r15 and c_r2) else "✗",
  f"R-15 de D343 dit : « {r15.group(0)[:300] if r15 else '—'} … » ; la consigne R-2 ajoute un rejeu unique. **Les deux règles se combinent mais ne se recouvrent pas** : R-15 écrit « un seul rouge ⇒ arrêt », R-2 admet UN rejeu pour un rouge hors de la fusion. Tension résolue par écrit dans `regle-portes.md` § 4.3 (décision dérivée par la session, à ratifier)")
reg_d338 = re.search(r"\| D338 \| A \|.*", TEXTES[CONT]).group(0)
reg_d339 = re.search(r"\| D339 \| A \|.*", TEXTES[CONT]).group(0)
v("R-2.d", "précédents du rejeu unique : D338, D342, D348", "≈",
  f"le rejeu unique est dans D339 (R-6 de D339 ; « rejeu » dans la ligne de registre D339 : {len(trouve(reg_d339, 'rejeu'))}, dans D338 : {len(trouve(reg_d338, 'rejeu'))}) — **D338 est le CADRAGE du rang 43, sans rejeu ; le précédent est D339** ; D342 (`regle-rejeu.md`, existe : {existe(SHA_BASE, 'docs/preuves/D342/portes/regle-rejeu.md')}) et D348 (§ 9 « la porte `test` se rejoue une fois » : {len(trouve(TEXTES[CONT], 'la porte `test` se rejoue une fois'))} occurrence(s)) tiennent")
harnais = sorted(l for l in git("ls-tree", "--name-only", SHA_BASE, "neutralisation/").splitlines() if re.search(r"neutralize-.*\.py$", l))
apres_fusion = len(harnais) + len([f for f in diff_trois_points() if re.match(r"neutralisation/neutralize-.*\.py$", f)])
v("R-3.a", "`lancer-campagnes.py --tout` joue tout `neutralize-*.py`, jamais lancé par la session cloud", "✓" if (len(harnais) == 62 and apres_fusion == 68) else "≈", f"{len(harnais)} harnais `neutralize-*.py` à {SHA_BASE} ; la fusion en apporte {apres_fusion - len(harnais)} (ca1 à ca6) → {apres_fusion} ; le BILAN § 3 dit « jamais lancé » ({len(trouve(B, 'jamais lancé'))} occurrence)")
quatre = {
    "neutralize-horizon.py": r"H6",
    "neutralize-available-on.py": r"\\r\\n",
    "neutralize-r49.py": r"\\r\\n",
    "neutralize-r33.py": r"M-12",
}
lignes = []
for nom, mot in quatre.items():
    src = blob(SHA_BASE, f"neutralisation/{nom}")
    lignes.append(f"{nom} : {len(trouve(src, mot))} occurrence(s) de `{mot}` ({len(src.splitlines())} lignes)")
v("R-3.b", "les quatre harnais antérieurs vus en erreur existent et portent ce que le backlog décrit (fins de ligne en dur ; garde de fuseau M-12 ; ancre H6)", "✓" if all(len(trouve(blob(SHA_BASE, f'neutralisation/{n}'), mt_)) > 0 for n, mt_ in quatre.items()) else "✗", " ; ".join(lignes) + " — ⚠ le BILAN dit « douze `\\r\\n` en dur » pour r49 : le source en porte davantage, le BILAN ne dit pas ce qu'il compte (ancres ou occurrences)")
# H6 : l'ancre, sur CE poste (CRLF) et sur le blob (LF)
CRLF = b"\r\n"
anc_crlf = b'    case "ok":\r\n    case "unreachable":\r\n      return null;'
anc_lf = anc_crlf.replace(CRLF, b"\n")
disque = open("apps/client/src/components/search/search-view.tsx", "rb").read()
blob_lf = subprocess.run(["git", "show", f"{SHA_BASE}:apps/client/src/components/search/search-view.tsx"], capture_output=True).stdout
n_disque, n_blob_crlf, n_blob_lf = disque.count(anc_crlf), blob_lf.count(anc_crlf), blob_lf.count(anc_lf)
v("R-3.c", "BILAN : l'ancre H6 de `neutralize-horizon.py` était « périmée AVANT la session » (le fichier visé identique à origin/main)", "✗" if (n_disque == 1 and n_blob_lf == 1 and n_blob_crlf == 0) else "≈",
  f"**l'ancre H6 est TROUVÉE** : fichier de travail de ce poste (CRLF : {disque.count(CRLF)} fins de ligne) {n_disque} occurrence avec `\\r\\n` (celle du harnais) ; blob git de {SHA_BASE} (LF) : {n_blob_crlf} avec `\\r\\n`, {n_blob_lf} avec `\\n` seul. **Le texte visé est là ; l'ancre échoue seulement dans un clone en LF** — même classe que `available-on` et `r49`, pas une ancre périmée. Le diagnostic du BILAN et de a-reporter-au-backlog.md est FAUX ; il ne se reporte pas tel quel au backlog (R-7)")
revalid = []
for n in harnais:
    for mm in trouve(blob(SHA_BASE, n), r"revalidate: 300"):
        revalid.append(f"{n.split('/')[-1]} …{blob(SHA_BASE, n)[max(0, mm.start() - 70):mm.end() + 10].replace(chr(10), ' ')}")
v("R-3.d", "« par exemple une cible qui ancrait `revalidate: 300` dans api.ts »", "≈", f"exemple, pas affirmation : {len(harnais)} harnais lus ; la chaîne `revalidate: 300` apparaît {len(revalid)} fois, ici : {revalid} — **côté remplacement (la mutation qui REMET un cache), pas côté ancre** quand le contexte montre `cache: \"no-store\"` juste avant (D348 a déjà remplacé `revalidate` par `no-store` dans `getVenueBySlug`) ; aucune ancre périmée de cette forme n'est prévisible — c'est la fusion rejouée qui le dira")
src_svc = blob(SHA_BR, SERVICE)
v("R-4.a", "la liste et la carte appellent la même fonction `publicFilter`", "✓" if (re.search(r"async list\(.*?this\.publicFilter\(", src_svc, re.S) and re.search(r"async map\(.*?this\.publicFilter\(", src_svc, re.S)) else "✗", f"{SERVICE} à {SHA_BR} : `publicFilter` appelée {len(trouve(src_svc, r'this\.publicFilter\('))} fois ; `PUBLIC_BASE_WHERE` {len(trouve(src_svc, 'PUBLIC_BASE_WHERE'))} occurrences ({len(src_svc.splitlines())} lignes)")
spec_r50 = existe(SHA_BASE, "e2e/specs/r50-salle-publiee.e2e.ts")
spec_ca6 = existe(SHA_BR, "e2e/specs/ca6-carte.e2e.ts")
spec_int = existe(SHA_BR, "apps/api/test/int/venue-map.int-spec.ts")
cnt = lambda sha, p, mot: len(trouve(blob(sha, p), mot))
v("R-4.b", "les specs existantes (r50, ca6) mesurent peut-être que masquée / supprimée / non publiée est absente de la liste ET de la carte", "?" if (spec_r50 and spec_ca6 and spec_int) else "✗",
  f"les trois fichiers existent (r50 à main : {spec_r50} ; ca6 et `venue-map.int-spec.ts` à la branche : {spec_ca6}, {spec_int}) ; occurrences de `HIDDEN|deletedAt|DRAFT|masqu|supprim` — r50 : {cnt(SHA_BASE, 'e2e/specs/r50-salle-publiee.e2e.ts', r'HIDDEN|deletedAt|DRAFT|masqu|supprim')}, ca6 : {cnt(SHA_BR, 'e2e/specs/ca6-carte.e2e.ts', r'HIDDEN|deletedAt|DRAFT|masqu|supprim')}, venue-map.int-spec : {cnt(SHA_BR, 'apps/api/test/int/venue-map.int-spec.ts', r'HIDDEN|deletedAt|DRAFT|masqu|supprim|UNPUBLISHED')} — **ce que chacun mesure se LIT après la fusion** (R-4), pas ici")
api_br = blob(SHA_BR, API_TS)
gvm = re.search(r"export async function getVenueMap.*?\n}\n", api_br, re.S)
v("R-4.c", "la carte reste en no-store (invariant de D348)", "≈" if (gvm and 'cache: "no-store"' in gvm.group(0)) else "✗",
  f"`getVenueMap` fait `fetch(…, {{ cache: \"no-store\", signal }})` : {bool(gvm and 'cache: \"no-store\"' in gvm.group(0))} ; ⚠ nuance : « reste » suppose un état d'avant — la fonction est NEUVE, et elle est appelée **depuis le navigateur** (le commentaire de la branche le dit), donc le cache de DONNÉES de Next, objet de D348, ne la concerne pas ; le `no-store` écarte ici le cache HTTP du navigateur")
fr_m, fr_b, fr_pred = cles_plat(blob(SHA_BASE, FR)), fr_br, cles_plat(git("show", f"{ARBRE_FUSION_ATTENDU}:{FR}"))
ar_pred = cles_plat(git("show", f"{ARBRE_FUSION_ATTENDU}:{AR}"))
pub = [k for k in fr_m if "publicationReview" in k]
mapk = [k for k in fr_b if k.split(".")[0] == "map"]
plancher = re.search(r"toBeGreaterThanOrEqual\((\d+)\)", blob(SHA_BASE, PARITE))
v("R-5", "repère de `i18n-parity.spec.ts` relevé après fusion : « 29 clés neuves […] plus les 8 du bloc publicationReview de D350 »", "≈",
  f"mesuré sur les fichiers : main {len(fr_m)} clés (FR = AR : {len(fr_m) == len(cles_plat(blob(SHA_BASE, AR)))}) ; branche {len(fr_b)} ; arbre prédit de la fusion {len(fr_pred)} (FR = AR : {len(fr_pred) == len(ar_pred)}) = {len(fr_m)} + {len(mapk)} (bloc `map`) ; **le bloc `publicationReview` compte {len(pub)} clés, pas 8** (D350 : six clés) ; le repère vaut **{plancher.group(1) if plancher else '—'}**, soit {len(fr_m) - int(plancher.group(1)) if plancher else '—'} sous le total de main AVANT la fusion : la porte « le total ne recule pas » ne voit une perte qu'au-delà de ce seuil")
v("R-6", "aucun code neuf au-delà de la fusion, sauf ce que la fusion casse", "✓", "décision de méthode, vérifiée par le diff final et la table (`git diff 5951b2c..HEAD --name-only` ⊆ la table) au contrôle de fin de lot")
manque = [m_ for m_ in ("glissement", "build de production") if not trouve(A, m_)]
v("R-7.a", "chaque entrée de a-reporter-au-backlog.md entre dans ZWADJ_BACKLOG.md ; dont le glissement du point du pro et « aucun build de production joué »", "≈",
  f"a-reporter-au-backlog.md ({len(A)} caractères parcourus) **ne porte PAS** « {' », « '.join(manque)} » ({len(manque)} des 2 absents) : ces deux limites sont dans le BILAN § 3 ({len(trouve(B, 'glissement'))} et {len(trouve(B, 'build de PRODUCTION'))} occurrence) — la session les ÉCRIT depuis le BILAN, ce n'est pas une copie")
v("R-7.b", "ce-qui-part-vers-le-tiers.md et les 29 clés arabes (arabe-a-relire.md) existent", "✓" if (existe(SHA_BR, TIERS) and existe(SHA_BR, ARABE) and len(mapk) == 29) else "✗", f"{TIERS} : {existe(SHA_BR, TIERS)} ; {ARABE} : {existe(SHA_BR, ARABE)} ; clés du bloc `map` à la branche : {len(mapk)}")
mortes = trouve(A, r"à retirer à l'intégration, pas ici")
v("R-7.c", "a-reporter : trois clés de catalogue mortes « à retirer à l'intégration, pas ici »", "≈",
  f"{len(mortes)} occurrence(s) ; **tension** avec R-6 (aucun code neuf : retirer des clés change `fr.json` et `ar.json`) ET avec R-5 (« le baisser, jamais » : retirer trois clés fait reculer le total de 1 296 à 1 293) — **ce lot ne les retire pas** ; entrée de backlog, à ordonner par Ko")
v("R-8", "S-192 refusée, les 29 gardes passent en assertion native au rang 54 ; ici : une entrée de backlog", "✓", "décision du relecteur ; l'entrée est écrite par la clôture, rien d'autre (consigne, R-8)")
v("R-9", "la base de développement de Ko : intouchée ; `zwadj_test` et `zwadj_e2e` seules", "?", "engagement de méthode ; se constate à la clôture : aucune commande du lot ne vise la base de Ko, aucun `.env` n'est lu (rapport, règle de D337)")

# ───────────────────────── 3. FORME ET FIN (consigne §§ 3 et 4) ─────────────────────────
sec8 = re.search(r"## 8\..*?(?=\n## 9\.)", BRUT_BILAN, re.S)
n8 = len(re.findall(r"^\d+\. ", sec8.group(0), re.M)) if sec8 else 0
v("F-1", "les sept scénarios du BILAN § 8 ; ceux de D350 « s'ils ne sont pas faits »", "✓" if (n8 == 7 and existe(SHA_BASE, "docs/preuves/D350/scenarios-ko.md")) else "✗", f"{n8} scénarios numérotés lus dans § 8 ; `docs/preuves/D350/scenarios-ko.md` existe : {existe(SHA_BASE, 'docs/preuves/D350/scenarios-ko.md')}")
v("F-2", "compteur : VINGT-SIX → TRENTE-DEUX", "≈", "l'arithmétique tient (26 + 6). **Mais D283/D292 : un lot qui touche un TEST ou un HARNAIS compte ; R-5 permet de retoucher `i18n-parity.spec.ts` (un test), R-3 l'ancre d'un harnais.** Si l'un des deux a lieu, ce lot écrit lui-même du code de test : TRENTE-TROIS selon la règle d'AGENTS.md, TRENTE-DEUX selon la lettre de la consigne — **décidé et écrit à la clôture, avec ce que cela change pour Ko**")
fc_ref = git("rev-parse", "--verify", "-q", "origin/front-client").strip()
v("F-3", "la branche est GARDÉE (comme front-client)", "✓" if fc_ref else "✗", f"la référence `origin/front-client` existe encore : {fc_ref[:12] or 'NON'} (la branche gardée au précédent D342) ; `origin/par-carte` = {opc[:12]} ; aucune commande de ce lot ne supprime de branche")
v("F-4", "décision produit n° 2 (« carte reportée post-MVP, placeholder ») devient fausse par la fusion", "≈", f"{len(trouve(TEXTES[CONT], 'Carte interactive\\*\\* : reportée post-MVP'))} occurrence(s) dans {CONT} (« Les décisions produit tranchées », n° 2) ; a-reporter-au-backlog.md demande de l'ANNOTER « à l'intégration, par la session qui écrit les fichiers d'autorité » ({len(trouve(A, 'Annoter la décision produit'))} occurrence) — **la consigne ne le liste pas** ; la passe D277 le fait et le dit")

# ───────────────────────── SORTIE ─────────────────────────
tot = {s: len([r for r in R if r[2] == s]) for s in ("✓", "≈", "✗", "?")}
sortie = []
sortie.append("D351 — lecture adverse de la consigne du rang 53 et du BILAN de `par-carte`, contre le dépôt")
sortie.append(f"état de départ {SHA_BASE} · branche {SHA_BR} · base commune {MB} · arbre de fusion attendu {ARBRE_FUSION_ATTENDU[:12]}")
sortie.append("calibration (deux bras, D286) : " + " ; ".join(f"{n} → ({p}, {q})" for n, p, q, ok in cal if ok))
sortie.append("texte parcouru (caractères, après aplatissement) : " + " ; ".join(f"{k} {v_}" for k, v_ in LU.items()))
sortie.append("")
for ident, enonce, verdict, detail in R:
    sortie.append(f"[{ident}] {verdict}  {enonce}")
    sortie.append(f"      {detail}")
sortie.append("")
sortie.append(f"TOTAL : {len(R)} contrôles — {tot['✓']} ✓ · {tot['≈']} ≈ · {tot['✗']} ✗ · {tot['?']} ?   (attendu : la somme égale le nombre de contrôles listés ci-dessus)")
sortie.append(f"somme des verdicts = {sum(tot.values())} ; contrôles imprimés = {len(R)} ; égalité : {sum(tot.values()) == len(R)}")
texte = "\n".join(sortie) + "\n"
if "--sortie" in sys.argv:
    chemin = sys.argv[sys.argv.index("--sortie") + 1]
    with open(chemin, "w", encoding="utf-8", newline="\n") as f:
        f.write(texte)
print(texte)
