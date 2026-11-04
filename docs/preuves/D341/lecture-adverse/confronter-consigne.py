#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 44 (suite) — L36-3a-1, le code — contre le dépôt — D341 (forme ALLÉGÉE).

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D341/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il ne lit que des OBJETS GIT à SHA fixe (SHA_BASE = e40c141, l'état de DÉPART du lot) et n'écrit rien d'autre que, si `--sortie` est donné, le
fichier de sortie (UTF-8, écrit par le script lui-même : jamais par redirection du shell). Une seule vérification exécute autre chose que `git` :
l'affirmation de R-4 sur NFKC, rejouée dans Node (`node -e`, arguments en LISTE — aucun texte ne traverse un interpréteur, D289).

POURQUOI IL EXISTE : la consigne demande une lecture adverse « contre le dépôt ». Chaque affirmation VÉRIFIABLE est ici une fonction qui rend
(verdict, détail), et le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

VERDICTS : ✓ vrai · ✗ faux (la règle d'arrêt de la consigne joue) · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit en seconde
partie, jamais tu) · ? non vérifiable contre le dépôt (dit pourquoi).

FORME ALLÉGÉE : les affirmations de la consigne uniquement (état de départ, règles et lignes citées, décisions citées, effets annoncés). Les MESURES
du cadrage vivent dans `docs/preuves/D340/cadrage.md`, avec la sortie brute des commandes qui les ont produites — elles ne sont pas des affirmations
de la consigne. La section 4 ci-dessous cherche, EN ADVERSAIRE, les endroits où la consigne se contredit elle-même ou contredit le cadrage.

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D340/lecture-adverse/confronter-consigne.py` tel quel — il est collé aux affirmations de D340 (SHA,
lignes, noms). Seuls les PRINCIPES sont repris : texte APLATI avant toute recherche multi-mots (AGENTS.md, D277/D294), jamais de comptage par
sous-chaîne sans contexte (D275), un bloc qui s'étend sur plusieurs lignes se lit en entier (le défaut d'instrument de D340, passe 1).

CALIBRATION (D286 : deux bras, et il ABANDONNE si un cas manque son verdict) : un cas VRAI connu doit rendre ✓, un cas FAUX connu doit rendre ✗,
pour CHAQUE sorte de test employée plus bas (ligne du registre, littéral dans un fichier nommé, ligne numérotée, motif cherché par git grep) ; et
pour la mesure NFKC, un cas qui CHANGE sous NFKC (la ligature « ﬁ ») doit être vu comme changé, un cas qui ne change pas (« a ») comme inchangé —
sans quoi « aucun des caractères listés ne change » serait vrai de n'importe quelle liste (un zéro sur zéro élément parcouru, D290).
"""
import json
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "e40c141"
SHA_TABLE = "ed30944"

CONT = "ZWADJ_CONTINUITE.md"
BACK = "ZWADJ_BACKLOG.md"
AGENTS = "AGENTS.md"
CADRAGE = "docs/preuves/D340/cadrage.md"


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def blob(path: str) -> str:
    return git("show", f"{SHA_BASE}:{path}")


def aplati(texte: str) -> str:
    return re.sub(r"\s+", " ", texte)


def lignes(path: str) -> list[str]:
    return blob(path).splitlines()


def presente_dans(path: str, motif: str) -> bool:
    return motif in aplati(blob(path))


def git_grep(motif: str, *chemins: str) -> list[str]:
    """Occurrences (fichier:ligne:texte) du motif regex dans l'arbre de SHA_BASE, sur les chemins donnés (pathspecs git)."""
    sortie = git("grep", "-n", "-E", motif, SHA_BASE, "--", *chemins)
    return [l.split(":", 1)[1] if ":" in l else l for l in sortie.splitlines() if l.strip()]


RESULTATS: list[tuple[str, str, str, str]] = []  # (id, verdict, affirmation, détail)


def noter(ident: str, ok: bool | None, affirmation: str, detail: str, nuance: bool = False) -> None:
    verdict = "?" if ok is None else ("≈" if (ok and nuance) else ("✓" if ok else "✗"))
    RESULTATS.append((ident, verdict, affirmation, detail))


def ligne_contient(path: str, n: int, motif: str) -> tuple[bool, str]:
    ls = lignes(path)
    l = ls[n - 1] if 0 < n <= len(ls) else ""
    return motif in l, f"{len(ls)} lignes parcourues ; ligne {n} = « {l.strip()[:110]} »"


def sections_du_cadrage() -> dict[str, str]:
    """Le cadrage découpé par titre `## n.` ; chaque section en TEXTE APLATI."""
    texte = blob(CADRAGE)
    morceaux = re.split(r"^## ", texte, flags=re.M)
    out: dict[str, str] = {}
    for m in morceaux[1:]:
        titre = m.split("\n", 1)[0]
        num = re.match(r"(\d+)\.", titre)
        if num:
            out[num.group(1)] = aplati(m)
    return out


def nfkc_changes(points: list[int]) -> list[str]:
    """Rend, parmi les points de code donnés, ceux que NFKC CHANGE (exécuté dans Node). Arguments en liste : aucun texte ne traverse un interpréteur."""
    code = ("const pts = JSON.parse(process.argv[1]);"
            "const out = pts.filter(cp => { const s = String.fromCodePoint(cp); return s.normalize('NFKC') !== s; })"
            ".map(cp => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'));"
            "process.stdout.write(JSON.stringify(out));")
    r = subprocess.run(["node", "-e", code, json.dumps(points)], capture_output=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError(f"node a échoué : {r.stderr[:200]}")
    return json.loads(r.stdout)


def calibrer() -> str:
    registre = aplati(blob(CONT))
    v1, f1 = "| D340 | A |" in registre, "| D999 | A |" in registre
    v2, f2 = presente_dans("e2e/playwright.config.ts", "zwadj_e2e"), presente_dans("e2e/playwright.config.ts", "zwadj_base_qui_n_existe_pas")
    v3 = ligne_contient("apps/api/src/app.module.ts", 71, "ThrottlerGuard")[0]
    f3 = ligne_contient("apps/api/src/app.module.ts", 71, "RolesGuard")[0]
    v4 = len(git_grep(r"class PasswordService", "apps/api/src/auth/password.service.ts")) == 1
    f4 = len(git_grep(r"class_qui_n_existe_nulle_part_xyz", "apps/api/src/auth/password.service.ts")) == 0
    table = git("show", f"{SHA_TABLE}:docs/preuves/D341/table-ouverture.md")
    v5 = "`docs/preuves/D341/table-ouverture.md`" in table
    f5 = "`apps/api/src/staff/fichier-qui-n-existe-pas.ts`" in table
    cas = {"registre": (v1, f1), "littéral dans un fichier": (v2, f2), "ligne numérotée": (v3, f3), "git grep": (v4, f4), "chemin entre accents graves dans la table": (v5, f5)}
    for nom, (vrai, faux) in cas.items():
        attendu_faux = (faux is True) if nom == "git grep" else (faux is False)
        if not (vrai is True and attendu_faux):
            print(f"CALIBRATION RATÉE ({nom}) : cas vrai → {vrai} (attendu True), cas faux → {faux}. ABANDON.")
            sys.exit(3)
    # Le bras NFKC : « ﬁ » (U+FB01) CHANGE sous NFKC, « a » (U+0061) ne change pas. Sans le premier, « aucun ne change » serait vrai de toute liste.
    positif = nfkc_changes([0xFB01])
    negatif = nfkc_changes([0x61])
    if positif != ["U+FB01"] or negatif != []:
        print(f"CALIBRATION RATÉE (NFKC) : « ﬁ » → {positif} (attendu ['U+FB01']), « a » → {negatif} (attendu []). ABANDON.")
        sys.exit(3)
    return ("calibration : registre (ligne D340 → ✓, ligne D999 → ✗) ; littéral dans un fichier nommé (`zwadj_e2e` → ✓, `zwadj_base_qui_n_existe_pas` → ✗) ; "
            "ligne numérotée (app.module.ts:71 contient ThrottlerGuard → ✓, contient RolesGuard → ✗) ; git grep (`class PasswordService` → 1 occurrence, motif inexistant → 0) ; "
            "chemin entre accents graves dans la table du premier commit (`docs/preuves/D341/table-ouverture.md` → ✓, un chemin inventé → ✗) ; "
            "NFKC dans Node (« ﬁ » est vu comme changé, « a » comme inchangé) — les douze bras tiennent.")


# ── 0 — l'état de départ -------------------------------------------------------------------------------------------------------------------------
def a_depart() -> None:
    base = git("rev-parse", SHA_BASE).strip()
    parent = git("rev-parse", f"{SHA_TABLE}^").strip()
    noms = [n for n in git("show", "--name-only", "--format=", SHA_TABLE).splitlines() if n.strip()]
    noter("0.1", parent == base and noms == ["docs/preuves/D341/table-ouverture.md"],
          "le premier commit du lot (la table) a pour parent e40c141 et ne contient que table-ouverture.md",
          f"{SHA_BASE} → {base[:12]} ; parent de {SHA_TABLE} = {parent[:12]} ; fichiers du commit = {noms}")
    origin = git("rev-parse", "origin/main").strip()
    noter("0.2", origin == base, "origin/main = e40c141 au moment de la lecture (la consigne : « Si origin/main a bougé, tu t'arrêtes »)",
          f"origin/main = {origin[:12]} ; SHA de base = {base[:12]} (après `git fetch` fait par la session avant cette lecture)")
    noter("0.3", git("stash", "list").strip() == "", "aucun stash", f"`git stash list` = {git('stash', 'list').strip() or 'vide'}")
    reg = [l for l in lignes(CONT) if re.match(r"^\| D\d+ \|", l)]
    dernier = re.match(r"^\| (D\d+) \|", reg[-1]).group(1)
    noter("0.4", dernier == "D340", "le dernier numéro du registre est D340 (attendu D341 pour ce lot)", f"{len(reg)} lignes de registre parcourues ; dernière = {dernier}")
    occ = {p: len(re.findall(r"D341", aplati(blob(p)))) for p in (CONT, BACK, AGENTS, "CLAUDE.md")}
    noter("0.5", all(v == 0 for v in occ.values()), "D341 n'est attribué dans aucun fichier d'autorité", f"4 fichiers parcourus (texte aplati) ; occurrences de « D341 » = {occ}")
    noter("0.6", git("branch", "--show-current").strip() == "main", "branche main", f"branche = {git('branch', '--show-current').strip()}")
    noter("0.7", git("status", "--short", "--", ".", ":(exclude)docs/preuves/D341").strip() == "",
          "arbre propre à l'ouverture (hors les pièces D341 en cours d'écriture)", f"`git status --short` hors docs/preuves/D341 = {git('status', '--short', '--', '.', ':(exclude)docs/preuves/D341').strip() or 'vide'}")
    try:
        piece = open("docs/preuves/D341/consigne.md", "rb").read()
    except OSError:
        piece = b""
    t = piece.decode("utf-8", errors="replace")
    r_ids = re.findall(r"^- (R-\d+)\.", t, re.M)
    sections = re.findall(r"^([0-4])\. [A-ZÉ]", t, re.M)
    noter("0.8", r_ids == [f"R-{i}" for i in range(1, 11)] and sections == ["0", "1", "2", "3", "4"] and b"\r" not in piece and piece.endswith(b"\n"),
          "la pièce docs/preuves/D341/consigne.md porte les sections 0 à 4 et les décisions R-1 à R-10, en LF, finie par une fin de ligne",
          f"{len(piece)} octets parcourus ; sections = {sections} ; décisions = {r_ids} ; octets CR = {piece.count(bytes([13]))}. "
          "⚠ Le texte n'est pas comparable octet pour octet au message de Ko (il n'est pas au dépôt) : la fidélité de la copie est une déclaration de la session.")


def a_table() -> None:
    """La table d'ouverture (premier commit, SHA_TABLE) satisfait-elle ce que la consigne en exige ? Adversaire de la session elle-même."""
    table = git("show", f"{SHA_TABLE}:docs/preuves/D341/table-ouverture.md")
    chemins = {
        "migration": "apps/api/prisma/migrations/20261104170000_staff_layer/migration.sql",
        "schéma": "apps/api/prisma/schema.prisma",
        "sonde de migration": "apps/api/test/int/migration-non-empty.int-spec.ts",
        "types": "packages/types/src/staff.ts",
        "nom de compte": "packages/types/src/staff-account-name.ts",
        "index des types": "packages/types/src/index.ts",
        "module": "apps/api/src/staff/staff.module.ts",
        "contrôleur": "apps/api/src/staff/staff-session.controller.ts",
        "service": "apps/api/src/staff/staff-session.service.ts",
        "garde": "apps/api/src/staff/staff-session.guard.ts",
        "décorateurs": "apps/api/src/staff/staff-decorators.ts",
        "cookies": "apps/api/src/staff/staff-cookies.ts",
        "port": "apps/api/src/staff/staff-store.types.ts",
        "adaptateur": "apps/api/src/staff/staff-store.prisma.ts",
        "politique de session": "apps/api/src/staff/staff-session-policy.ts",
        "politique de mot de passe": "apps/api/src/staff/staff-password-policy.ts",
        "app.module": "apps/api/src/app.module.ts",
        "débit": "apps/api/src/auth/auth.throttle.ts",
        "contrôleur d'auth": "apps/api/src/auth/auth.controller.ts",
        "client d'API": "packages/api-client/src/staff-client.ts",
        "messages FR": "packages/i18n/messages/fr.json",
        "messages AR": "packages/i18n/messages/ar.json",
        "harnais": "neutralisation/neutralize-r44.py",
    }
    manque = [k for k, p in chemins.items() if f"`{p}`" not in table]
    noter("0.9", not manque, "la table d'ouverture porte, en CHEMINS COMPLETS, les fichiers du § 5.5 (lot 1) — la consigne : « les noms du § 5.5 du cadrage, lot 1 »",
          f"table du premier commit ({SHA_TABLE}) : {len(table.splitlines())} lignes parcourues ; {len(chemins)} chemins complets cherchés entre accents graves ; manquants = {manque}")
    sha, nb = "68782d6a4a19a4768d5f15dd66bd534e7a33055cc755411e33f16d18c50fdcce", "10 001"
    manque_r5 = [m for m in (sha, "MIT", "SecLists", nb, "4afe4d3de0a5d227c59ae2f162d22b93b4c27bfd", "minuscules") if m not in table]
    noter("0.10", not manque_r5, "R-5 : la table écrit la source, la licence et le sha256 de la liste, le nombre d'entrées (au moins 10 000) et la comparaison en minuscules",
          f"motifs cherchés = sha256, « MIT », « SecLists », « 10 001 », le commit de la source, « minuscules » ; manquants = {manque_r5}")


# ── 1 — le cadrage que la consigne cite -------------------------------------------------------------------------------------------------------------
def a_cadrage() -> None:
    sec = sections_du_cadrage()
    noter("1.1", all(k in sec for k in ("3", "4", "5", "6", "7", "9")), "le cadrage de D340 porte les sections 3 (verrous), 4 (modes), 5 (fichiers, nullabilité, garanties), 6 (taille), 7 (décisions S-98 à S-112), 9 (limites)",
          f"sections trouvées = {sorted(sec, key=int)}")
    cad = blob(CADRAGE)
    lot1 = [l for l in cad.splitlines() if re.match(r"^\| 1 \| ", l)]
    noms1 = " ".join(lot1)
    attendus = ["staff.module.ts", "staff-session.controller.ts", "staff-session.service.ts", "staff-session.guard.ts", "staff-decorators.ts", "staff-cookies.ts",
                "staff-store.types.ts", "staff-store.prisma.ts", "staff-session-policy.ts", "staff-password-policy.ts", "staff-client.ts", "migration-non-empty.int-spec.ts"]
    manque = [a for a in attendus if a not in noms1]
    noter("1.2", len(lot1) >= 8 and not manque, "§ 5.5 du cadrage porte les fichiers du lot 1 (la table d'ouverture en reprend les noms)",
          f"{len(cad.splitlines())} lignes parcourues ; lignes de la table 5.5 pour le lot « 1 » = {len(lot1)} ; noms cherchés = {len(attendus)} ; manquants = {manque}")
    c5 = sections_du_cadrage()["5"]
    six = [x for x in "abcdef" if f"({x})" in c5]
    noter("1.3", "### 5.2 La tranche ne dit pas la nullabilité" in cad and "### 5.3 Garanties de base proposées" in cad and six == list("abcdef"),
          "§ 5.2 (nullabilité) et § 5.3 (six garanties, (a) à (f)) existent",
          f"{len(cad.splitlines())} lignes du cadrage parcourues ; titres `### 5.2` et `### 5.3` présents ; section 5 aplatie : {len(c5)} caractères ; marqueurs trouvés = {six}")
    noter("1.4", "pour « jamais zéro Manager »" in c5 and "non proposé" in c5,
          "§ 5.3 : aucun déclencheur pour « jamais zéro Manager » (§ 3.2)", f"section 5 aplatie : motifs « pour « jamais zéro Manager » » = {'pour « jamais zéro Manager »' in c5} et « non proposé » = {'non proposé' in c5}")
    c3 = sections_du_cadrage()["3"]
    noter("1.5", "Aucune garde base" in c3 and "déclencheur différé" in c3,
          "§ 3.2 : « Aucune garde base pour « jamais zéro Manager » : elle exigerait un déclencheur différé… hors de la tranche »", f"section 3 aplatie : {len(c3)} caractères parcourus")
    c6 = sections_du_cadrage()["6"]
    noter("1.6", "≈ 2,2 × L36-2" in c6 and "L36-3a-1" in c6 and "L36-3a-2" in c6 and "L36-3b" in c6 and "un seul rôle utilisable : MANAGER" in c6,
          "§ 6.3 : « ≈ 2,2 × L36-2 » pour 3a d'un seul tenant, les trois lots, et « un seul rôle utilisable : MANAGER » pour 3a-1", f"section 6 aplatie : {len(c6)} caractères parcourus")
    noter("1.7", "pro_staff_sessions.device_id" in c6 and "exige un appareil" in c6,
          "§ 6.2 : la frontière de R-5 est contredite parce que `pro_staff_sessions.device_id` exige un appareil", f"section 6 aplatie : motifs « pro_staff_sessions.device_id » et « exige un appareil » cherchés")
    c7 = sections_du_cadrage()["7"]
    manque7 = [f"S-{n}" for n in range(98, 113) if f"**S-{n} " not in c7]
    noter("1.8", not manque7, "S-98 à S-112 existent (quinze décisions de la session, au cadrage § 7)", f"section 7 aplatie : {len(c7)} caractères ; identifiants cherchés S-98..S-112 ; manquants = {manque7}")
    classes = {
        "ratifiées (R-2)": ["S-98", "S-99", "S-100", "S-101", "S-102", "S-104", "S-105", "S-106", "S-108", "S-109", "S-112"],
        "S-107 pour 3a-2": ["S-107"], "refusée (R-3)": ["S-103"], "confirmée avec ajouts (R-4)": ["S-110"], "modifiée (R-5)": ["S-111"]}
    couverts = sorted({s for v in classes.values() for s in v}, key=lambda s: int(s[2:]))
    noter("1.9", couverts == [f"S-{n}" for n in range(98, 113)],
          "les décisions R-2 à R-5 couvrent S-98 à S-112 SANS trou ni doublon (11 ratifiées + S-107 + S-103 + S-110 + S-111 = 15)", f"S couvertes par la consigne = {couverts} ({len(couverts)} sur 15)")
    s103 = c7[c7.find("**S-103"):c7.find("**S-104")]
    noter("1.10", "STAFF_LOGIN_PAUSED" in s103, "S-103 (refusée) est bien la décision « un code distinct pendant la pause : `STAFF_LOGIN_PAUSED` »", f"texte de S-103 aplati : {len(s103)} caractères parcourus")
    s110 = c7[c7.find("**S-110"):c7.find("**S-111")]
    noter("1.11", all(m in s110 for m in ("NFKC", "minuscules", "diacritiques latins", "tatweel", "ا", "ى → ي", "ة → ه", "blancs comprimés")),
          "S-110 (confirmée avec ajouts) dit : NFKC, minuscules, diacritiques latins, voyelles brèves et tatweel, `أ إ آ ٱ → ا`, `ى → ي`, `ة → ه`, blancs comprimés",
          f"texte de S-110 aplati : {len(s110)} caractères parcourus")
    s112 = c7[c7.find("**S-112"):]
    noter("1.12", "res.headers[\"set-cookie\"]" in s112 and "AVANT de poser ses cookies" in s112, "S-112 : masquer `res.headers[\"set-cookie\"]` AVANT de poser les cookies", f"texte de S-112 aplati : {len(s112)} caractères parcourus")
    c9 = blob(CADRAGE).split("## 9. LIMITES", 1)[1]
    lim = {int(m.group(1)): aplati(m.group(2)) for m in re.finditer(r"^(\d+)\. (.*?)(?=^\d+\. |\Z)", c9, re.M | re.S)}
    noter("1.13", 12 in lim and "SIG-1" in lim[12] and "Nest démarrée" in lim[12] and 6 in lim and "lecture SQL par requête Pro" in lim[6] and "à mesurer au lot 3a-1" in lim[6].lower(),
          "limite 12 du cadrage = SIG-1 mesuré au niveau de pino-http, pas à travers l'application Nest démarrée ; limite 6 = la lecture du drapeau par requête Pro, « à mesurer au lot 3a-1 »",
          f"{len(lim)} limites parcourues ; limite 12 = « {lim.get(12, '')[:90]} » ; limite 6 = « {lim.get(6, '')[:90]} »")
    c5k = [l for l in cad.splitlines() if re.match(r"^\| \*\*K-1[4-8]\*\*", l)]
    noter("1.14", len(c5k) == 5 and all("| 1 |" in l for l in c5k), "K-14 à K-18 sont les cinq routes du lot 1 (§ 5.1)", f"lignes `| **K-14..18** |` trouvées = {len(c5k)} ; chacune porte le lot « 1 » = {all('| 1 |' in l for l in c5k)}")
    modes = re.findall(r"^\| MP-(\d+) \|", cad, re.M)
    noter("1.15", len(modes) == 44, "le § 4 liste les modes de défaillance (la consigne : « un mode absent du § 4 ne se code pas »)", f"lignes `| MP-n |` parcourues = {len(modes)} (attendu 44, MP-1 à MP-44)")


# ── 2 — les règles et les lignes citées -------------------------------------------------------------------------------------------------------------
def a_regles_citees() -> None:
    ag = aplati(blob(AGENTS))
    noter("2.1", "L'ORDRE DES COMMITS D'UN LOT EST FIXÉ" in ag and "3. **Puis** les `.md` d'autorité, **les arbitrages de Ko en PREMIÈRE écriture**" in ag,
          "AGENTS.md (D328) : l'ordre des commits ; point 3 = les .md d'autorité, les arbitrages en première écriture", f"AGENTS.md aplati : {len(ag)} caractères parcourus")
    noter("2.2", "À partir du prochain lot de code — LES ROUGES AVANT LE CODE (D334" in ag and "empreinte sha256 de chaque fichier de test" in ag,
          "AGENTS.md (D334, item 5) : les pièces des rouges, avec l'empreinte sha256 de chaque fichier de test, dans un commit ANTÉRIEUR au premier commit de code", "motifs cherchés dans AGENTS.md aplati")
    noter("2.3", "Une session qui trouve le poste sur batterie au moment des portes de clôture ne les lance pas : elle s'arrête et le dit." in ag,
          "AGENTS.md porte R-9 de D340 (batterie) mot pour mot", "phrase cherchée dans AGENTS.md aplati")
    noter("2.4", "AUCUN LOT HORS DE L'ORDRE DES RANGS" in ag and "un rang que Ko arbitre" in ag, "AGENTS.md (D302) : « un rang que Ko arbitre » ; aucun lot hors de l'ordre des rangs", "motifs cherchés dans AGENTS.md aplati")
    cont = aplati(blob(CONT))
    noter("2.5", "Aucun lot ne s'ouvre sans l'arbitrage de Ko" in cont, "ZWADJ_CONTINUITE.md porte « Aucun lot ne s'ouvre sans l'arbitrage de Ko » (que R-9 relit)", f"CONTINUITE aplati : {len(cont)} caractères parcourus")
    dr5 = aplati("\n".join(lignes(CONT)[2104:2120]))
    motifs = ["réponse identique pour compte inconnu et mauvais mot de passe", "5 échecs consécutifs = pause de 15 minutes par membre", "mot de passe 90 jours et PIN 90 jours",
              "passwordSchema actuel + refus des plus courants + refus de réutiliser le précédent", "jamais zéro Manager actif", "nom de compte unique par salle",
              "Inactivité : 10 minutes CÔTÉ SERVEUR", "plafond absolu de session 12 h", "Première activation : le propriétaire (compte commun, e-mail vérifié) crée le profil Manager"]
    manque = [m for m in motifs if m not in dr5]
    noter("2.6", not manque, "DR5 dit ce que R-3, R-5 et la section 3 en citent (réponse identique, 5 échecs / 15 min, 90 jours, passwordSchema + courants + réutilisé, inactivité 10 min, plafond 12 h, activation par le propriétaire)",
          f"{len(motifs)} motifs cherchés dans les lignes 2105-2120 aplaties ({len(dr5)} caractères) ; manquants = {manque}")
    dr8 = aplati(next((l for l in lignes(CONT) if l.startswith("DR8. ")), ""))
    noter("2.7", "Tout schéma est ratifié par Ko avant sa migration" in dr8 and "s'arrête et présente l'écart" in dr8, "DR8 : tout schéma est ratifié avant sa migration ; une session qui doit s'en écarter s'arrête et présente l'écart", f"ligne DR8 aplatie : {len(dr8)} caractères parcourus")
    tr = lignes(CONT)[2128:2133]
    tra = aplati(" ".join(tr))
    noter("2.8", len(tr) == 5 and all(l.startswith("[L36-3]") for l in tr) and "expires_at (jamais au-delà de pin_expires_at)" in tra and "pin_failed_count (CHECK entre 0 et 3)" in tra,
          "la tranche [L36-3] (lignes 2129-2133) porte `expires_at (jamais au-delà de pin_expires_at)` pour l'appareil et la CHECK `pin_failed_count` entre 0 et 3 (R-6 s'appuie dessus)", f"lignes 2129-2133 lues ; {len(tra)} caractères aplatis")
    ok, d = ligne_contient("apps/api/src/auth/auth.controller.ts", 223, 'sameSite: "lax"')
    noter("2.9", ok, "le cookie zwadj_rt est posé en SameSite=Lax aujourd'hui (R-2, précision sur S-99)", d)
    pw = blob("apps/api/src/auth/password.service.ts")
    noter("2.10", "verifyAgainstDummy" in pw and "(D5)" in pw, "`verifyAgainstDummy` (D5) existe : le coût factice d'un argon2.verify complet (R-3)", f"{len(pw.splitlines())} lignes parcourues ; verifyAgainstDummy = {'verifyAgainstDummy' in pw} ; « (D5) » = {'(D5)' in pw}")
    pil = blob("docs/preuves/D340/portes/passe-secteur.sh")
    refus = {"batterie": 'refus "le poste est sur BATTERIE', "Docker absent": "le démon Docker ne répond pas", "base absente": "le conteneur zwadj-db n'est pas Up",
             "arbre sale": "l'arbre n'est pas propre", "port d'e2e occupé": "un port d'e2e est occupé"}
    manque_r = [k for k, v in refus.items() if v not in pil]
    noter("2.11", not manque_r, "le pilote passe-secteur.sh refuse : batterie, Docker ou base absents, port d'e2e occupé, arbre sale (R-10)",
          f"{len(pil.splitlines())} lignes parcourues ; refus cherchés = {list(refus)} ; manquants = {manque_r}")
    ordre = lignes(CONT)
    r44 = [i + 1 for i, l in enumerate(ordre[:2420]) if "RANG 44 : OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE" in l]
    r45 = [i + 1 for i, l in enumerate(ordre[:2420]) if l.startswith("⇒ **RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR.**")]
    noter("2.12", len(r44) >= 1 and len(r45) == 1, "l'ordre des rangs porte « RANG 44 : OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE » et « RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR » (les formes que la consigne fait évoluer en fin de lot)",
          f"{len(ordre[:2420])} lignes parcourues ; lignes « RANG 44 : OUVERT… » = {r44} ; ligne « RANG 45 : EN ATTENTE DE CADRAGE… » = {r45}")
    ag_compteur = "compteur POUR MÉMOIRE **TROIS, inchangé**" in ag or "compteur POUR MÉMOIRE TROIS, inchangé" in ag or "**TROIS, inchangé**" in ag
    noter("2.13", ag_compteur, "le compteur pour mémoire est à TROIS à l'ouverture (la consigne : TROIS → QUATRE)", "motif « TROIS, inchangé » cherché dans AGENTS.md aplati")
    m22 = git_grep(r"^## .*[Pp]atrons|^### D340 — rubrique « Patrons »", CONT)
    noter("2.14", any("D340 — rubrique « Patrons »" in x for x in m22), "la rubrique « Patrons » existe dans les sections de lot (D340 en porte une)", f"titres trouvés par git grep = {[x.strip()[:70] for x in m22][:3]}")


# ── 3 — R-4 : l'affirmation sur NFKC, REJOUÉE ---------------------------------------------------------------------------------------------------
def a_nfkc() -> None:
    chiffres = list(range(0x0660, 0x066A)) + list(range(0x06F0, 0x06FA))
    marques = list(range(0x200B, 0x2010)) + list(range(0x202A, 0x202F)) + list(range(0x2066, 0x206A)) + [0xFEFF]
    lettres = [0x0624, 0x0626, 0x06A9, 0x06CC]
    ch = nfkc_changes(chiffres)
    mq = nfkc_changes(marques)
    lt = nfkc_changes(lettres)
    noter("3.1", ch == [] and mq == [],
          "R-4 : « NFKC ne ramène ni ces chiffres ni ces marques » (chiffres arabes-indiens et persans ; U+200B–U+200F, U+202A–U+202E, U+2066–U+2069, U+FEFF)",
          f"EXÉCUTÉ dans Node : {len(chiffres)} chiffres examinés → changés par NFKC = {ch} ; {len(marques)} marques examinées → changées par NFKC = {mq}")
    noter("3.2", lt == [], "R-4 : les quatre lettres ajoutées (ؤ ئ ک ی) ne sont pas ramenées par NFKC non plus — le remplacement explicite est nécessaire",
          f"EXÉCUTÉ dans Node : {len(lettres)} lettres examinées → changées par NFKC = {lt}")


# ── 4 — EN ADVERSAIRE : où la consigne se contredit, ou contredit le cadrage ---------------------------------------------------------------------
def a_adversaire() -> None:
    cad = blob(CADRAGE)
    mp17 = aplati(next((l for l in cad.splitlines() if l.startswith("| MP-17 |")), ""))
    mp16 = aplati(next((l for l in cad.splitlines() if l.startswith("| MP-16 |")), ""))
    noter("4.1", "ne déclenchent pas 20" in mp17 and "≤ 5" in mp16,
          "TENSION R-3 ↔ MP-17 : le cadrage (MP-17) veut que 20 mauvais mots de passe parallèles ne déclenchent PAS 20 argon2 ; R-3 veut que la requête mise en pause paie un argon2 FACTICE au même coût",
          f"MP-16 : « {mp16[-150:]} » ; MP-17 : « {mp17[:130]} ». Lecture retenue, à écrire : au plus 5 vérifications du VRAI hachage ; les autres paient un argon2 factice (R-3). "
          "Le coût total reste borné par la limite de débit par IP, qui existe déjà.", nuance=True)
    c7 = sections_du_cadrage()["7"]
    s102 = c7[c7.find("**S-102"):c7.find("**S-103")]
    noter("4.2", "se réservent AVANT la vérification" in s102 and "vingt essais simultanés comptent trois" in s102,
          "R-2 ratifie S-102 (« les compteurs se réservent AVANT la vérification ») : c'est la décision qui produit « 5 comptées » sur 20 parallèles dans le test de la section 3 (le cadrage chiffre l'exemple du PIN : vingt essais comptent trois)",
          f"texte de S-102 aplati : {len(s102)} caractères parcourus ; « se réservent AVANT la vérification » = {'se réservent AVANT la vérification' in s102} ; « vingt essais simultanés comptent trois » = {'vingt essais simultanés comptent trois' in s102}. "
          "Le cas du mot de passe (5, pas 3) vient de DR5 (« 5 échecs consécutifs ») et de MP-16 : la consigne applique S-102 au seuil de 5.")
    s105 = c7[c7.find("**S-105"):c7.find("**S-106")]
    noter("4.3", "AUTRES sessions" in s105 and "réinitialisation par un Manager" in s105,
          "S-105 (ratifiée) couvre le changement de mot de passe (K-18, ce lot) ET la réinitialisation par un Manager (lot 3a-2) : seule la première moitié est dans ce lot",
          f"texte de S-105 aplati : {len(s105)} caractères parcourus. La moitié « réinitialisation » appartient à K-21 (3a-2), hors lot.", nuance=True)
    c5 = sections_du_cadrage()["5"]
    c6 = sections_du_cadrage()["6"]
    noter("4.4", "(3b : PIN neuf si absent, expiré ou verrouillé)" in c5 and "amendement des réponses de K-14, K-15, K-18" in c6,
          "la consigne dit « K-14 à K-18 » seulement : les amendements des réponses de K-14, K-15, K-18 pour le PIN (« rendu une fois ») sont du lot 3b, pas de ce lot",
          f"§ 5.1 : « (3b : PIN neuf si absent, expiré ou verrouillé) » dans la ligne de K-15 = {'(3b : PIN neuf si absent, expiré ou verrouillé)' in c5} ; § 6.3 : « amendement des réponses de K-14, K-15, K-18 » dans la ligne du lot 3b = {'amendement des réponses de K-14, K-15, K-18' in c6}")
    ligne_3a1 = aplati(next((l for l in cad.splitlines() if l.startswith("| **L36-3a-1")), ""))
    ligne_3a2 = aplati(next((l for l in cad.splitlines() if l.startswith("| **L36-3a-2")), ""))
    noter("4.5", "audit" in ligne_3a1 and "audit des fiches" not in ligne_3a1 and "audit des fiches" in ligne_3a2,
          "R-8 place « l'audit création et modification de fiche » en 3a-2 ; la consigne, section 3, garde « l'audit » dans ce lot : il s'agit de l'audit de la couche (activation, connexion, déconnexion, changement de mot de passe), pas de celui des fiches",
          f"§ 6.3 lu : la ligne de 3a-1 contient « audit » = {'audit' in ligne_3a1} et PAS « audit des fiches » = {'audit des fiches' not in ligne_3a1} ; la ligne de 3a-2 contient « audit des fiches » = {'audit des fiches' in ligne_3a2}. "
          "Lecture retenue : deux audits différents, aucun recouvrement — mais le mot « audit » seul, dans la ligne de 3a-1, ne dit pas QUELLES actions sont journalisées : la liste de DR5 (connexions, échecs, verrouillage, déblocage, création, réinitialisation, désactivation) est à découper entre 3a-1 et 3a-2 par la session.",
          nuance=True)
    bk = aplati(blob(BACK))
    entrees = {"Q4 (b)": "Q4 (b)" in bk, "enquête D265": "D265" in bk, "garde des sorties console": "garde des sorties console" in bk, "NB-6": "NB-6" in bk,
               "recours administrateur d'un Manager sans second Manager": "recours administrateur d'un Manager sans second Manager" in bk}
    absentes = [k for k, v in entrees.items() if not v]
    noter("4.6", not absentes, "les points « HORS LOT » de la section 3 existent comme entrées ou mentions du backlog",
          f"backlog aplati : {len(bk)} caractères parcourus ; présent = {entrees}")
    noter("4.7", "Manager seul" not in bk,
          "« le recours administrateur d'un Manager seul (backlog) » : le backlog a la MENTION (dans l'annotation de l'entrée L36-3) mais PAS d'entrée à son nom ; l'expression « Manager seul » n'y figure pas",
          f"{len(bk)} caractères du backlog aplati parcourus ; {bk.count('Manager seul')} occurrence(s) de « Manager seul » (attendu 0) ; {bk.count('second Manager')} occurrence(s) de « second Manager » (annotation de L36-3). "
          "Le cadrage (MP-44, § 9.3) dit « procédure manuelle (SQL), à écrire au backlog » : l'entrée est donc DUE par ce lot, sans rang (D302).",
          nuance=True)
    ap = blob("apps/api/src/app.module.ts").splitlines()
    ligne30 = ap[29] if len(ap) > 29 else ""
    noter("4.8", "set-cookie" not in blob("apps/api/src/app.module.ts").lower() and "req.headers.cookie" in ligne30,
          "R-7 : la fuite existe déjà pour zwadj_rt (app.module.ts:30 ne masque pas le Set-Cookie de réponse)",
          f"{len(ap)} lignes parcourues ; ligne 30 = « {ligne30.strip()} » ; « set-cookie » dans le fichier = {'set-cookie' in blob('apps/api/src/app.module.ts').lower()}")
    e2e = git_grep(r"\b(staff|personnel|pin-login)\b|\bPIN\b", "e2e/specs")
    noter("4.9", len(e2e) == 0, "« la suite e2e existante, inchangée, le mesure » : aucune spec e2e ne mentionne le personnel, le PIN ou une session de personnel (elle mesure donc l'app Pro d'AVANT)",
          f"`git grep -w -E staff|personnel|pin-login|PIN` sous e2e/specs = {len(e2e)} occurrences")
    code_r44 = subprocess.run(["git", "cat-file", "-e", f"{SHA_BASE}:neutralisation/neutralize-r44.py"], capture_output=True).returncode
    code_r43 = subprocess.run(["git", "cat-file", "-e", f"{SHA_BASE}:neutralisation/neutralize-r43.py"], capture_output=True).returncode
    noter("4.10", code_r44 != 0 and code_r43 == 0,
          "le harnais `neutralize-r44.py` n'existe pas encore (aucune collision de nom) ; son prédécesseur `neutralize-r43.py` existe",
          f"`git cat-file -e e40c141:neutralisation/neutralize-r44.py` → code {code_r44} (attendu non nul) ; `…neutralize-r43.py` → code {code_r43} (attendu 0)")
    noter("4.11", "mustChangePassword" in blob(CADRAGE) and "MP-14" in blob(CADRAGE),
          "ce lot ne code PAS MP-14 ni MP-25 (mot de passe temporaire, mot de passe expiré : lot 3a-2) : le champ `mustChangePassword` voyage dans les réponses, la colonne existe, mais rien ne l'écrit à `true` dans ce lot",
          "§ 4 : MP-14 et MP-25 portent le lot « 2 » ; § 5.1 : K-15 rend `mustChangePassword`", nuance=True)


# ── 5 — ce qui ne se vérifie pas contre le dépôt -----------------------------------------------------------------------------------------------------
def a_non_verifiables() -> None:
    noter("5.1", None, "« origin/main = e40c141 (vérifié par le relecteur le 04/11/2026) »", "la vérification du relecteur est dans le chat ; la session a refait la sienne (0.2).")
    noter("5.2", None, "« adopté par Ko tel quel » / « Ko l'a collé » (en-tête, 1)", "la consigne s'écrit « par ADOPTION de ce message » (sa propre instruction) ; l'adoption n'est pas une parole de Ko.")
    noter("5.3", None, "R-1 : « erreur du relecteur, corrigée par le cadrage » ; la proposition des rangs 45 et 46", "des propositions et un aveu du relecteur, hors dépôt ; le rang suivant n'est écrit qu'à la clôture, sous la forme « EN ATTENTE DE CADRAGE DU RELECTEUR ».")
    noter("5.4", None, "R-9 et R-10 : « confirmées » (lectures de D302 ; trois décisions dérivées à la clôture de D340)",
          "les décisions de D340 sont écrites comme DÉRIVÉES par la session et À RATIFIER dans ZWADJ_CONTINUITE.md (relevé de 2.x : la phrase « nulle et ne se rejoue pas » y figure) ; leur confirmation est dans le chat, hors dépôt.")


def main() -> None:
    sortie = None
    if "--sortie" in sys.argv:
        sortie = sys.argv[sys.argv.index("--sortie") + 1]
    cal = calibrer()
    a_depart()
    a_table()
    a_cadrage()
    a_regles_citees()
    a_nfkc()
    a_adversaire()
    a_non_verifiables()
    n = len(RESULTATS)
    cpt = {v: sum(1 for r in RESULTATS if r[1] == v) for v in ("✓", "≈", "✗", "?")}
    out = [f"LECTURE ADVERSE DE LA CONSIGNE DU RANG 44 (SUITE, L36-3a-1) — D341 — instrument confronter-consigne.py, SHA de base {SHA_BASE}", cal, "",
           "══ PREMIÈRE PARTIE — COURTE ══",
           f"{n} contrôles parcourus : {cpt['✓']} ✓ · {cpt['≈']} ≈ (imprécis ou en tension, sans arrêt) · {cpt['✗']} ✗ · {cpt['?']} ? non vérifiables (attendu : aucun ✗ ; chaque ≈ et chaque ? expliqué en seconde partie)", "",
           "══ SECONDE PARTIE — EN ENTIER ══"]
    for ident, verdict, affirmation, detail in RESULTATS:
        out.append(f"{verdict} [{ident}] {affirmation}")
        out.append(f"     ↳ {detail}")
    texte = "\n".join(out) + "\n"
    print(texte, end="")
    if sortie:
        with open(sortie, "w", encoding="utf-8", newline="\n") as f:
            f.write(texte)
    sys.exit(0 if cpt["✗"] == 0 else 1)


if __name__ == "__main__":
    main()
