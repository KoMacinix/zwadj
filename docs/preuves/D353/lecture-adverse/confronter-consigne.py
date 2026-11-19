#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 55 — la mémoire du site client — contre le dépôt — D353.

MODE D'EMPLOI : depuis la RACINE, `python3 -I -X utf8 docs/preuves/D353/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il lit des OBJETS GIT à SHA fixe (SHA_BASE = cd8e079, l'état de DÉPART du lot) et le disque pour deux choses seulement : l'existence de chemins versés et la
sortie brute de D351 (immuable). `--sortie` écrit UTF-8, LF, par le script lui-même (jamais par redirection du shell — D298). Aucun texte ne traverse un
interpréteur : les arguments de `git` sont passés en LISTE (D289).

POURQUOI IL EXISTE : la consigne (§ 3) exige « lecture adverse de cette consigne contre le dépôt avant tout .md d'autorité ». Chaque affirmation VÉRIFIABLE est un
contrôle qui rend (verdict, détail) ; le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

VERDICTS : ✓ vrai · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit, jamais tu) · ✗ FAUX · ? non vérifiable contre le dépôt (dit pourquoi).

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D352/lecture-adverse/confronter-consigne.py` tel quel — collé aux affirmations du rang 54. Seuls ses PRINCIPES sont
repris : texte APLATI avant toute recherche multi-mots (D277/D294), jamais de comptage par sous-chaîne sans contexte (D275), le compte de ce qui a été parcouru à
côté du total (D290), la calibration à deux bras (D286).

CALIBRATION (D286, ABANDON si un cas manque son verdict) : pour chaque sorte de contrôle employée — motif cherché dans un fichier d'un SHA, ancêtre, existence d'un
chemin, comptage d'occurrences — un cas VRAI connu rend « présent » et un cas FAUX connu « absent ».
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "cd8e07921a4c18c2559506c463ede06eed3178a1"
CONT, BACK, AGENTS = "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"
API = "apps/client/src/lib/api.ts"
PW = "e2e/playwright.config.ts"
R48 = "e2e/specs/r48-assistant-choix.e2e.ts"
INT = "apps/api/test/int/venue-map.int-spec.ts"
SVC = "apps/api/src/venues/venues-public.service.ts"
SEED = "apps/api/prisma/seed.ts"
JOURNAL_R4 = "docs/preuves/D351/r4/mutation-no-store.txt"

SORTIE = None
if "--sortie" in sys.argv:
    SORTIE = sys.argv[sys.argv.index("--sortie") + 1]
LIGNES: list[str] = []


def dire(texte: str = "") -> None:
    LIGNES.append(texte)
    print(texte)


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace").stdout


def rc(*args):
    return subprocess.run(["git", *args], capture_output=True).returncode


def a(chemin: str, sha: str = SHA_BASE) -> str:
    """Le contenu d'un fichier à un SHA, CRLF → LF ; '' si absent."""
    return git("show", f"{sha}:{chemin}").replace("\r\n", "\n")


def aplati(t: str) -> str:
    return re.sub(r"\s+", " ", t)


def section_d352() -> str:
    """La section « Session du 18/11/2026 — D352 » BRUTE : de son titre `## Session du` jusqu'au titre `## Session du` SUIVANT (pas d'égalité de plage : elle cite d'autres S-nnn)."""
    brut = a(CONT)
    i = brut.find("## Session du 18/11/2026 — D352")
    if i < 0:
        return ""
    j = brut.find("\n## Session du", i + 10)
    return brut[i:j if j > 0 else len(brut)]


def S_DEF(n: int):
    """Une DÉFINITION de décision : une puce `- **S-nnn** —` en début de ligne dans la section D352 (pas une simple citation)."""
    return re.search(rf"^- \*\*S-{n}\*\* —", section_d352(), re.M)


# Un APPEL du semis (jamais un mot dans un commentaire) : `db:seed` ou `seedReferentials(` ou `seed(`.
APPEL_SEMIS = re.compile(r"db:seed|seedReferentials\s*\(|\bseed\s*\(")


def existe(chemin: str) -> bool:
    return rc("cat-file", "-e", f"{SHA_BASE}:{chemin}") == 0


# ── CALIBRATION : un cas vrai et un cas faux pour chaque sorte de contrôle.
def calibrer() -> bool:
    cas = [
        ("motif présent dans un fichier d'un SHA (cas vrai connu)", "revalidate: 3600" in a(API), True),
        ("motif absent (cas faux connu)", "zzz-motif-inexistant-zzz" in a(API), False),
        ("ancêtre (cas vrai : le départ est ancêtre de lui-même)", rc("merge-base", "--is-ancestor", SHA_BASE, SHA_BASE) == 0, True),
        ("ancêtre (cas faux : la pointe de par-carte n'est pas descendante de HEAD)", rc("merge-base", "--is-ancestor", "HEAD", "origin/par-carte") == 0, False),
        ("existence d'un chemin (vrai)", existe(API), True),
        ("existence d'un chemin (faux)", existe("docs/inexistant/zzz.md"), False),
        ("comptage d'occurrences (`getVenueMap` apparaît au moins une fois)", a(API).count("getVenueMap") >= 1, True),
        ("comptage d'occurrences (un jeton inexistant en compte zéro)", a(API).count("zzzJetonInexistant") == 0, True),
        ("définition `- **S-218** —` dans la section D352 (cas vrai connu)", S_DEF(218) is not None, True),
        ("définition `- **S-999** —` dans la section D352 (cas faux connu)", S_DEF(999) is not None, False),
        ("motif d'APPEL du semis trouvé dans harness.ts (cas vrai connu)", bool(APPEL_SEMIS.search(a("e2e/fixtures/harness.ts"))), True),
        ("motif d'APPEL du semis : le commentaire « Elle NE seede PAS » de global-setup.ts ne le déclenche pas (le faux positif de la passe 1)", bool(APPEL_SEMIS.search(a("e2e/global-setup.ts"))), False),
    ]
    manques = 0
    for nom, obtenu, attendu in cas:
        ok = obtenu == attendu
        manques += not ok
        dire(f"  calibration {'✓' if ok else '✗'} {nom} : {obtenu} (attendu {attendu})")
    dire(f"  calibration : {len(cas)} cas · {manques} manqué(s) (attendu 0)")
    return manques == 0


RESULTATS: list[tuple[str, str, str, str]] = []


def controle(ident: str, verdict: str, affirmation: str, detail: str) -> None:
    RESULTATS.append((ident, verdict, affirmation, detail))
    dire(f"[{ident}] {verdict}  {affirmation}")
    dire(f"      {detail}")


def fonction(source: str, nom: str) -> str:
    """Le corps d'une fonction exportée de api.ts : de `export async function <nom>` jusqu'à la prochaine `export `."""
    i = source.find(f"export async function {nom}")
    if i < 0:
        return ""
    j = source.find("\nexport ", i + 10)
    return source[i:j if j > 0 else len(source)]


def main() -> int:
    dire("Lecture adverse de la consigne du rang 55 contre le dépôt — D353")
    dire(f"SHA de départ lu : {SHA_BASE}")
    dire("── calibration")
    if not calibrer():
        dire("✗ ABANDON : un cas de calibration a manqué son verdict — rien n'est confronté.")
        return 2
    dire("── contrôles")

    # § 0 — l'état attendu
    om = git("rev-parse", "origin/main").strip()
    parent = git("rev-parse", "HEAD~1").strip()
    dire(f"(information) origin/main au moment de la lecture : {om} ; HEAD : {git('rev-parse', 'HEAD').strip()} ; parent de HEAD : {parent}")
    diff = git("diff", SHA_BASE, "HEAD", "--name-only").split()
    controle("0.a", "✓" if parent == SHA_BASE and om == SHA_BASE and diff == ["docs/preuves/D353/table-ouverture.md"] else "✗",
             "origin/main = cd8e079 (consigne, § 0) ; le premier commit du lot est la table d'ouverture SEULE",
             f"origin/main = {om[:7]} ; le parent du premier commit du lot est {parent[:7]} ; `git diff {SHA_BASE[:7]} HEAD --name-only` = {diff}")
    br = {b: git("rev-parse", "--short=7", f"origin/{b}").strip() for b in ("front-client", "integration-45", "par-carte")}
    controle("0.b", "✓" if br == {"front-client": "43996e2", "integration-45": "63511ce", "par-carte": "7fdc679"} else "✗",
             "branches distantes gardées (relevé de la table d'ouverture)", f"relevé : {br}")
    cont = aplati(a(CONT))
    controle("0.c", "✓" if "TRENTE-QUATRE" in cont and "RANG 55 : EN ATTENTE DE CADRAGE DU RELECTEUR" in cont else "✗",
             "rang 54 CLOS (D352), compteur POUR MÉMOIRE TRENTE-QUATRE, « RANG 55 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat : la mémoire du site client)",
             f"texte aplati parcouru : {len(cont)} caractères ; « TRENTE-QUATRE » : {cont.count('TRENTE-QUATRE')} occurrence(s) ; « RANG 55 : EN ATTENTE DE CADRAGE DU RELECTEUR » : {cont.count('RANG 55 : EN ATTENTE DE CADRAGE DU RELECTEUR')} occurrence(s) ; « mémoire du site client » : {cont.count('mémoire du site client')}")
    reg = [int(m.group(1)) for m in re.finditer(r"^\| D(\d+) \|", a(CONT), re.M)]
    tot_aplati = len(cont) + len(aplati(a(BACK))) + len(aplati(a(AGENTS)))
    controle("0.d", "✓" if max(reg) == 352 and "D353" not in cont and "D353" not in aplati(a(BACK)) and "D353" not in aplati(a(AGENTS)) else "✗",
             "numéro attendu : D353, pris en LISANT le registre",
             f"{len(reg)} lignes de registre parcourues, dernier numéro {max(reg)} ; « D353 » : {cont.count('D353')} dans la continuité, {aplati(a(BACK)).count('D353')} au backlog, {aplati(a(AGENTS)).count('D353')} dans AGENTS.md ; {tot_aplati} caractères aplatis examinés")

    # § 1 a — les trois entrées du backlog
    bl = aplati(a(BACK))
    entrees = {
        "(i) référentiels": "LES LISTES DE RÉFÉRENTIELS DU CLIENT SONT MISES EN CACHE UNE HEURE",
        "(ii) no-store de la carte": "LE `no-store` DE `getVenueMap` N'EST AFFIRMÉ PAR AUCUN TEST",
        "(iii) sans créneau actif": "« SANS CRÉNEAU ACTIF » (AVEC UNE DATE) N'EST PAS JOUÉE SUR LA CARTE",
    }
    trouvees = {k: bl.count(v) for k, v in entrees.items()}
    controle("1.a", "✓" if all(n == 1 for n in trouvees.values()) else "✗", "les trois entrées du backlog existent, UNE fois chacune",
             f"backlog aplati parcouru : {len(bl)} caractères ; occurrences : {trouvees} ; étiquettes : `[E2E][INFRA]` {bl.count('[E2E][INFRA]')} · `[TESTS][CARTE]` {bl.count('[TESTS][CARTE]')}")
    controle("1.b", "✓" if not existe("claude/rang50-message.md") else "✗", "le message `claude/rang50-message.md` du 10/11 « n'a jamais été adopté » : il n'est dans aucun fichier du dépôt",
             f"`git cat-file -e {SHA_BASE[:7]}:claude/rang50-message.md` : {existe('claude/rang50-message.md')} ; (non vérifiable plus avant : le message n'est PAS lu ici, la consigne le remplace)")
    sect = section_d352()
    defs = [n for n in range(218, 231) if S_DEF(n)]
    citees = sorted(set(int(x) for x in re.findall(r"S-(2\d\d)", sect)))
    controle("1.c", "✓" if defs == list(range(218, 231)) else "✗", "S-218 à S-230 existent dans la section D352 (ratifiées par adoption, 1 b)",
             f"section D352 BRUTE parcourue : {len(sect)} caractères, {len(sect.splitlines())} lignes ; DÉFINITIONS `- **S-nnn** —` trouvées parmi 218 à 230 : {len(defs)} sur 13 ({defs[0] if defs else '-'} à {defs[-1] if defs else '-'}) ; numéros S-2nn simplement CITÉS dans la section : {len(citees)} ({citees[0]} à {citees[-1]}) — la section renvoie aussi à S-210…S-217 de D351, ce n'est pas une anomalie")
    i_ent = bl.find("L'EN-TÊTE DE L'ASSISTANT D'UNE SALLE (`PublicationHeaderState`) AFFIRME ENCORE")
    controle("1.d", "≈", "(1 c) « Une entrée de backlog [PRO], sans rang » pour l'en-tête de l'assistant — la consigne la présente comme À ÉCRIRE",
             f"l'entrée EXISTE DÉJÀ dans le backlog (rang 54, étiquette `[PRO][À ORDONNER PAR KO]`) : trouvée : {i_ent >= 0} ; elle posait la question que Ko a tranchée (« APRÈS ») ⇒ **ANNOTER cette entrée avec la réponse de Ko, sans en écrire une seconde** (un doublon se contredirait au premier changement) ; décision de la session, dite au rapport")

    # § 2 — les constats du relecteur
    api = a(API)
    revals = api.count("next: { revalidate: 3600 }")
    corps = {n: fonction(api, n) for n in ("getWilayas", "getAmenities", "getVenueStyles")}
    vides = {n: (c.count("return [];") == 2 and "if (!res.ok) return [];" in c and "catch {" in c) for n, c in corps.items()}
    controle("2.a", "✓" if revals == 3 and all(vides.values()) else "✗", "getWilayas, getAmenities, getVenueStyles : `fetch(…, { next: { revalidate: 3600 } })` et rendent `[]` sur une réponse non ok OU une exception",
             f"{len(api.splitlines())} lignes parcourues ; `next: {{ revalidate: 3600 }}` : {revals} occurrence(s) ; les trois fonctions trouvées : {[n for n, c in corps.items() if c]} ; `[]` sur non-ok ET sur exception : {vides}")
    vm = fonction(api, "getVenueMap")
    controle("2.b", "✓" if '{ cache: "no-store", signal }' in vm and "force-cache" not in vm else "✗", "getVenueMap est en `cache: \"no-store\"`",
             f"corps de getVenueMap parcouru : {len(vm.splitlines())} lignes ; `{{ cache: \"no-store\", signal }}` : {vm.count('{ cache: \"no-store\", signal }')} ; l'ancre est unique dans le fichier ? `{{ cache: \"no-store\", signal }}` apparaît {api.count('{ cache: \"no-store\", signal }')} fois au total (countVenues aussi : la mutation de D351 vise la fin de l'adresse de la carte)")
    pw = a(PW)
    controle("2.c", "✓" if 'name: "warmup"' in pw and 'dependencies: ["warmup"]' in pw else "✗", "le projet `warmup` passe avant `chromium`",
             f"{len(pw.splitlines())} lignes parcourues ; `name: \"warmup\"` : {pw.count('name: \"warmup\"')} ; `dependencies: [\"warmup\"]` : {pw.count('dependencies: [\"warmup\"]')}")
    r48 = a(R48)
    n_tol = len(re.findall(r"\.wz-chip\"\)\.count\(\)\) > 0", r48))
    controle("2.d", "✓" if n_tol == 2 and "la base e2e ne publie AUCUN style" in r48 else "✗", "r48 TOLÈRE l'absence de puces (S-153 : `if (… .wz-chip … count() > 0)`) et son commentaire dit « la base e2e ne publie AUCUN style »",
             f"{len(r48.splitlines())} lignes parcourues ; gardes `count() > 0` : {n_tol} (styles ET équipements : la consigne ne parle que des « goûts ») ; phrase « la base e2e ne publie AUCUN style » : {r48.count('la base e2e ne publie AUCUN style')}")
    d346 = "4 styles en base" in cont
    seed = a(SEED)
    refs = [k for k in ("wilaya.upsert", "city.upsert", "amenity.upsert", "venueStyle.upsert") if k in seed]
    ref_svc = a("apps/api/src/referentials/referentials.service.ts")
    filtre = "where" in ref_svc.split("listVenueStyles")[1] if "listVenueStyles" in ref_svc else None
    controle("2.e", "≈", "« D346 écrivait « la base e2e contenait 4 styles » : l'un des deux est faux, mesure-le » — lu, PAS encore mesuré",
             f"« 4 styles en base » dans la continuité : {d346} ; `seed.ts` sème {refs} ; `listVenueStyles` filtre par `where` : {filtre} (aucun filtre de publication : tout style semé est rendu) ⇒ **par lecture, c'est le commentaire de r48 (« AUCUN style ») qui est faux** ; **mais aucune migration n'insère de référentiel** : avant le semis les QUATRE listes sont vides, et c'est ce que le préchauffage voit ; **à MESURER** (R-1), pas à conclure d'ici")
    n_mig = sum(1 for f in git("ls-tree", "-r", "--name-only", SHA_BASE, "apps/api/prisma/migrations").split() if f.endswith("migration.sql") and re.search(r"INSERT INTO \"?(wilayas|cities|amenities|venue_styles)\b", a(f)))
    controle("2.f", "✓" if n_mig == 0 else "✗", "(non affirmé par la consigne — risque relevé) aucune migration n'insère de référentiel : le préchauffage voit des listes VIDES",
             f"migrations `migration.sql` examinées : {len([f for f in git('ls-tree', '-r', '--name-only', SHA_BASE, 'apps/api/prisma/migrations').split() if f.endswith('migration.sql')])} ; celles qui insèrent dans wilayas/cities/amenities/venue_styles : {n_mig}")
    sh = a("e2e/fixtures/harness.ts")
    controle("2.g", "✓" if "export function seedReferentials" in sh and "db:seed" in sh else "✗", "`seedReferentials()` existe et rejoue le semis de production (`db:seed`)", f"{len(sh.splitlines())} lignes parcourues ; fonction : {'export function seedReferentials' in sh} ; `db:seed` : {sh.count('db:seed')}")
    gs = a("e2e/global-setup.ts")
    mots = [(k + 1, l.strip()[:90]) for k, l in enumerate(gs.splitlines()) if "seed" in l.lower()]
    controle("2.h", "✓" if not APPEL_SEMIS.search(gs) else "✗", "(non affirmé par la consigne — risque relevé) `global-setup.ts` ne sème rien : seul `seedReferentials()`, appelé par les specs, le fait — APRÈS le préchauffage",
             f"{len(gs.splitlines())} lignes parcourues ; APPELS du semis (`db:seed`, `seedReferentials(`, `seed(`) : {len(APPEL_SEMIS.findall(gs))} ; le MOT « seed » apparaît {len(mots)} fois, en CONTEXTE : {mots} (un commentaire, pas un appel : la passe 1 comptait la sous-chaîne et s'est trompée)")
    controle("2.i", "≈", "(non affirmé par la consigne — fait relevé dans le code de Playwright 1.50.1) les serveurs (`webServer`) démarrent AVANT `globalSetup`",
             "`node_modules/.pnpm/playwright@1.50.1/node_modules/playwright/lib/runner/tasks.js`, `createGlobalSetupTasks` : `tasks.push(...createPluginSetupTasks(config), …globalTeardowns…, ...globalSetups…)` — les plugins (dont `webServer`) PRÉCÈDENT les `globalSetup` ; relevé sur disque (non versionné : `node_modules`), à rejouer ; conséquence : un correctif d'ordre dans `global-setup.ts` précède bien le préchauffage (projet `warmup`, dépendance de `chromium`), mais le serveur du client est DÉJÀ debout")

    # R-4
    dv = a("apps/client/src/components/venue/venue-detail-view.test.tsx").split("\n")
    seg = "\n".join(dv[371:378])
    controle("R-4.a", "≈", "« patron : venue-detail-view.test.tsx l. 374 pour la fiche »",
             f"`venue-detail-view.test.tsx` : {len(dv)} lignes parcourues ; l. 372-378 : « toHaveBeenCalledWith(stringContaining(\"/venues/salle-el-ryad/visit-slots?\"), objectContaining({{ cache: \"no-store\" }})) » : {'visit-slots' in seg and 'no-store' in seg} — **le patron de FORME est juste** (assertion sur le second argument de `fetch`), **mais il garde `getVisitSlots`, pas la fiche** : aucun test unitaire de `getVenueBySlug` n'existe (`grep getVenueBySlug` dans les `*.test.*` de apps/client : 0 fichier) ; sa garde est l'e2e `r50` M-3 et la cible PUB1-20 (D348). **Écart de désignation, sans conséquence sur ce lot** (R-6 : `getVenueBySlug` n'est pas touché) ; entrée de backlog")
    ref = a(JOURNAL_R4) if existe(JOURNAL_R4) else open(JOURNAL_R4, encoding="utf-8").read()
    controle("R-4.b", "✓" if "force-cache" in ref and "Test Files  47 passed (47)" in ref and "Tests  564 passed (564)" in ref else "✗", "la mutation de D351 (`docs/preuves/D351/r4/`) est le rouge de référence : sous `force-cache`, la suite client reste verte",
             f"{len(ref.splitlines())} lignes parcourues ; « code de sortie … : 0 » : {'code de sortie de la suite du client sous la mutation : 0' in ref} ; « 47 passed » et « 564 passed » : True ; restauration à l'octet : {'identique : True' in ref}")
    # R-5
    it = a(INT)
    controle("R-5.a", "✓" if it.count("availableOn") == 1 and "ACTIVE_SLOT" not in it and "slotTemplate" not in it else "≈", "« sans créneau actif, avec une date » n'est jouée par aucune spec de la carte",
             f"`venue-map.int-spec.ts` : {len(it.splitlines())} lignes parcourues ; `availableOn` : {it.count('availableOn')} occurrences, en CONTEXTE : {[(k + 1, l.strip()[:70]) for k, l in enumerate(it.splitlines()) if 'availableOn' in l]} (une clé de contrat, un attendu `null`, une date PASSÉE ⇒ 400 — aucune date future) ; `slotTemplate` : {it.count('slotTemplate')} ; `ACTIVE_SLOT` : {it.count('ACTIVE_SLOT')}")
    svc = a(SVC)
    controle("R-5.b", "✓" if svc.count("this.publicFilter(query, Date.now())") == 2 and "slotTemplates: { some: ACTIVE_SLOT }" in svc else "✗", "une seule autorité, `publicFilter`, pour la liste ET la carte (D351)",
             f"{len(svc.splitlines())} lignes parcourues ; `this.publicFilter(query, Date.now())` : {svc.count('this.publicFilter(query, Date.now())')} appel(s) (liste + carte) ; la clause « sans créneau actif » `slotTemplates: {{ some: ACTIVE_SLOT }}` : {svc.count('slotTemplates: { some: ACTIVE_SLOT }')} occurrence (dans `publicFilter`, rien de copié)")
    # R-6
    autres = {n: ('cache: "no-store"' in fonction(api, n)) for n in ("searchVenues", "getVenueBySlug", "countVenues", "getVenueAvailability", "getVisitSlots", "getVenueMap", "getApiHealth")}
    controle("R-6", "✓" if all(autres.values()) else "✗", "`getVenueBySlug` et `searchVenues` restent en `no-store` (invariant de D348)", f"fonctions examinées : {len(autres)} ; en `no-store` : {autres}")
    # § 3 — les outils nommés
    t1 = "docs/preuves/D352/neutralisation/lancer-touchees.py"
    t2 = "docs/preuves/D352/portes/masquer-jetons.py"
    controle("3.a", "≈", "`lancer-touchees.py (D352)` et `masquer-jetons.py` — les outils de la forme",
             f"`lancer-touchees.py` existe à {t1} : {existe(t1)} ; `masquer-jetons.py` existe à {t2} : {existe(t2)} ; **ce sont des PIÈCES versées de D352, PAS des fichiers de `neutralisation/`** (la consigne dit « lancer-touchees.py (D352) » sans chemin) ; copiés par le lot tels quels ; `neutralisation/audit-secrets.py` existe : {existe('neutralisation/audit-secrets.py')} ; `neutralisation/lancer-campagnes.py` : {existe('neutralisation/lancer-campagnes.py')}")
    controle("3.b", "✓" if "R-15. LA PREUVE" in a(CONT) and "DEUX fois de suite" in a(CONT) else "✗", "« deux passes e2e vertes de suite, règle commitée avant (R-15 de D343) »",
             f"« R-15. LA PREUVE » : {a(CONT).count('R-15. LA PREUVE')} ; « DEUX fois de suite » : {a(CONT).count('DEUX fois de suite')}")
    controle("F-1", "✓", "compteur TRENTE-QUATRE → TRENTE-CINQ : D283 — un lot qui touche un test ou un harnais compte", "34 + 1 = 35 ; le lot écrit des tests (e2e, client, intégration) et un harnais")
    controle("F-2", "?", "R-9 : sur batterie, aucune porte", "engagement de méthode ; relevé de l'état machine : table d'ouverture (secteur, BatteryStatus = 2) ; se constate à chaque passe (pilote de D340)")

    ecart = {"✓": 0, "≈": 0, "✗": 0, "?": 0}
    for _, v, _, _ in RESULTATS:
        ecart[v] += 1
    dire()
    dire(f"TOTAL : {len(RESULTATS)} contrôles — {ecart['✓']} ✓ · {ecart['≈']} ≈ · {ecart['✗']} ✗ · {ecart['?']} ?   (attendu : la somme égale le nombre de contrôles listés ci-dessus)")
    dire(f"somme des verdicts = {sum(ecart.values())} ; contrôles imprimés = {len(RESULTATS)} ; égalité : {sum(ecart.values()) == len(RESULTATS)}")
    if SORTIE:
        with open(SORTIE, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(LIGNES) + "\n")
    return 1 if ecart["✗"] else 0


if __name__ == "__main__":
    sys.exit(main())
