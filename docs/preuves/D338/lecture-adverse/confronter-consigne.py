#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 43 (L36-2) contre le dépôt — D338 (forme ALLÉGÉE).

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D338/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il ne lit que des OBJETS GIT à SHA fixe (SHA_BASE = 985fd20, l'état d'ARRIVÉE du lot) et n'écrit rien d'autre que, si
`--sortie` est donné, le fichier de sortie (en UTF-8, écrit par le script lui-même : jamais par redirection du shell).

POURQUOI IL EXISTE : la consigne demande une lecture adverse « contre le dépôt ». Chaque affirmation VÉRIFIABLE est ici
une fonction qui rend (verdict, détail), et le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

FORME ALLÉGÉE : les affirmations de la consigne uniquement (numéros de ligne, citations, état de départ, règles citées).
Les MESURES du cadrage (qui écrit quoi, quelles contraintes existent) vivent dans `docs/preuves/D338/cadrage.md`, avec la
sortie brute des commandes qui les ont produites — elles ne sont pas des affirmations de la consigne.

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D337/lecture-adverse/confronter-consigne.py` — il est collé aux affirmations
de D337 (SHA de base, noms de colonnes) ; reprendre ses extracteurs aurait importé leurs hypothèses. Seuls les PRINCIPES sont
repris : texte APLATI avant toute recherche multi-mots (AGENTS.md, D277/D294), jamais de comptage par sous-chaîne sans
contexte (D275), commentaires SQL retirés avant de chercher une instruction.

CALIBRATION (D286 : deux bras, et il ABANDONNE si un cas manque son verdict) : un cas VRAI connu doit rendre ✓, un cas FAUX
connu doit rendre ✗, avant toute affirmation de la consigne.
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "985fd20"
SHA_TABLE = "636f830"

CONT = "ZWADJ_CONTINUITE.md"
BACK = "ZWADJ_BACKLOG.md"


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def blob(path: str) -> str:
    return git("show", f"{SHA_BASE}:{path}")


def aplati(texte: str) -> str:
    return re.sub(r"\s+", " ", texte)


def lignes(path: str) -> list[str]:
    return blob(path).splitlines()


def sans_commentaires_sql(sql: str) -> str:
    return "\n".join(re.sub(r"--.*$", "", l) for l in sql.splitlines())


RESULTATS: list[tuple[str, str, str, str]] = []  # (id, verdict, affirmation, détail)


def noter(ident: str, ok: bool | None, affirmation: str, detail: str) -> None:
    verdict = "✓" if ok is True else ("✗" if ok is False else "?")
    RESULTATS.append((ident, verdict, affirmation, detail))


def calibrer() -> str:
    registre = aplati(blob(CONT))
    vrai = "| D337 | A |" in registre
    faux = "| D999 | A |" in registre
    if not (vrai is True and faux is False):
        print(f"CALIBRATION RATÉE : cas vrai → {vrai} (attendu True), cas faux → {faux} (attendu False). ABANDON.")
        sys.exit(3)
    # Défaut d'instrument de la passe 1 (voir defauts-instrument.txt) : la recherche d'un littéral dans un fichier NOMMÉ n'avait pas ses deux bras.
    vrai2 = presente_dans("e2e/playwright.config.ts", "zwadj_e2e")
    faux2 = presente_dans("e2e/playwright.config.ts", "zwadj_base_qui_n_existe_pas")
    if not (vrai2 is True and faux2 is False):
        print(f"CALIBRATION RATÉE (littéral dans un fichier) : cas vrai → {vrai2}, cas faux → {faux2}. ABANDON.")
        sys.exit(3)
    return ("calibration : cas vrai (ligne D337 du registre) → ✓ ; cas faux (ligne D999) → ✗ ; "
            "littéral présent (`zwadj_e2e` dans e2e/playwright.config.ts) → ✓ ; littéral absent (`zwadj_base_qui_n_existe_pas`) → ✗ — les quatre bras tiennent.")


def presente_dans(path: str, motif: str) -> bool:
    return motif in aplati(blob(path))


def ligne_commence(path: str, n: int, debut: str) -> tuple[bool, str]:
    ls = lignes(path)
    l = ls[n - 1] if 0 < n <= len(ls) else ""
    return l.startswith(debut), f"{len(ls)} lignes parcourues ; ligne {n} = « {l[:90]} »"


def ligne_contient(path: str, n: int, motif: str) -> tuple[bool, str]:
    ls = lignes(path)
    l = ls[n - 1] if 0 < n <= len(ls) else ""
    return motif in l, f"{len(ls)} lignes parcourues ; ligne {n} = « {l.strip()[:100]} »"


def a_depart() -> None:
    base = git("rev-parse", SHA_BASE).strip()
    parent = git("rev-parse", f"{SHA_TABLE}^").strip()
    noms = [n for n in git("show", "--name-only", "--format=", SHA_TABLE).splitlines() if n.strip()]
    noter("0.1", parent == base and noms == ["docs/preuves/D338/table-ouverture.md"],
          "le premier commit du lot (la table) a pour parent 985fd20 et ne contient que table-ouverture.md",
          f"{SHA_BASE} → {base[:12]} ; parent de {SHA_TABLE} = {parent[:12]} ; fichiers du commit = {noms}")
    noter("0.2", git("stash", "list").strip() == "", "aucun stash", f"`git stash list` = {git('stash', 'list').strip() or 'vide'}")
    reg = [l for l in lignes(CONT) if re.match(r"^\| D\d+ \|", l)]
    dernier = re.match(r"^\| (D\d+) \|", reg[-1]).group(1)
    noter("0.3", dernier == "D337", "le dernier numéro du registre est D337 (attendu D338 pour ce lot)", f"{len(reg)} lignes de registre parcourues ; dernière = {dernier}")
    noter("0.4", git("branch", "--show-current").strip() == "main", "branche main", f"branche = {git('branch', '--show-current').strip()}")


def a_lignes_citees() -> None:
    ok, d = ligne_commence(CONT, 2104, "DR4. DEVIS BROUILLON NON OFFICIEL")
    noter("1.1", ok, "DR4 est à ZWADJ_CONTINUITE.md:2104", d)
    ok, d = ligne_commence(CONT, 2128, "[L36-2] quotes")
    noter("1.2", ok, "la tranche [L36-2] du schéma ratifié est à ZWADJ_CONTINUITE.md:2128", d)
    ok, d = ligne_contient(BACK, 2513, "L36-2 — LE DEVIS BROUILLON NON OFFICIEL")
    noter("1.3", ok, "l'entrée L36-2 du backlog est à ZWADJ_BACKLOG.md:2513", d)
    for n, nom in ((175, "create"), (216, "deliver"), (253, "revise"), (302, "convert"), (394, "cancel")):
        ok, d = ligne_contient("apps/api/src/venues/quotes.service.ts", n, f"async {nom}(")
        noter(f"1.4.{nom}", ok, f"quotes.service.ts:{n} est `{nom}`", d)
    ok, d = ligne_contient("packages/types/src/quote.ts", 371, "clientRecordId: z.string().uuid")
    noter("1.5.a", ok and ".optional()" in lignes("packages/types/src/quote.ts")[370], "quote.ts:371 : la fiche est FACULTATIVE à la création", d)
    ok, d = ligne_contient("packages/types/src/quote.ts", 319, "export function formatQuoteReference")
    noter("1.5.b", ok, "quote.ts:319 est formatQuoteReference", d)
    ok, d = ligne_contient("packages/types/src/quote.ts", 337, "export function quoteDocumentFilename")
    noter("1.5.c", ok, "quote.ts:337 est quoteDocumentFilename", d)
    ok, d = ligne_contient("e2e/global-setup.ts", 30, "DROP DATABASE IF EXISTS")
    noter("1.6.a", ok, "e2e/global-setup.ts:30 supprime la base de l'e2e (DROP DATABASE IF EXISTS)", d)
    setup = aplati(blob("e2e/global-setup.ts"))
    derive = 'import { DATABASE_URL } from "./playwright.config"' in setup and "const dbName = url.pathname" in setup
    noter("1.6.b", derive and "CREATE DATABASE" in setup,
          "global-setup.ts dérive le nom de la base de DATABASE_URL (importée de playwright.config), la supprime (:30) puis la recrée",
          f"{len(lignes('e2e/global-setup.ts'))} lignes parcourues ; import de DATABASE_URL et dérivation de dbName = {derive} ; `CREATE DATABASE` présent = {'CREATE DATABASE' in setup}")
    conf = lignes("e2e/playwright.config.ts")
    decl = [i + 1 for i, l in enumerate(conf) if "E2E_DATABASE_URL" in l and "zwadj_e2e" in l]
    noter("1.6.c", len(decl) == 1, "la base de l'e2e s'appelle zwadj_e2e par défaut (e2e/playwright.config.ts : E2E_DATABASE_URL ?? …/zwadj_e2e)",
          f"{len(conf)} lignes parcourues ; lignes portant E2E_DATABASE_URL et zwadj_e2e = {decl} (⚠ une variable d'environnement E2E_DATABASE_URL peut la surcharger : le défaut est la seule valeur lue ici)")


def a_decisions_citees() -> None:
    cont = aplati(blob(CONT))
    dr4 = next((l for l in lignes(CONT) if l.startswith("DR4. ")), "")
    dr4a = aplati(dr4)
    motifs = ["RENFORCÉE", "BROUILLON-AAAA-SSSS-NNNN", "filigrane sur chaque page", "préfixe du nom de fichier", "is_official passe à vrai",
              "ligne d'audit", "aucun numéro supprimé ni réutilisé", "garde serveur + CHECK en base", "colonnes exactes à fixer par la lecture de deliver()"]
    manque = [m for m in motifs if m not in dr4a]
    noter("2.1", not manque, "DR4 dit : même compteur, BROUILLON-AAAA-SSSS-NNNN, filigrane sur chaque page, préfixe du nom de fichier, promotion = même ligne/même numéro, ligne d'audit, garde serveur + CHECK, colonnes à fixer par deliver()",
          f"{len(motifs)} motifs cherchés dans la ligne DR4 aplatie ; manquants = {manque}")
    tr = aplati(next((l for l in lignes(CONT) if l.startswith("[L36-2] quotes")), ""))
    motifs2 = ["is_official boolean NOT NULL DEFAULT true", "jamais accepté ni marqué remis", "QUOTE_WRITABLE_STATUSES", "DRAFT, ACCEPTED, CANCELLED",
               "ACCEPTED n'a pas d'écrivain", "Aucun nouveau compteur"]
    manque2 = [m for m in motifs2 if m not in tr]
    noter("2.2", not manque2, "[L36-2] : is_official DEFAULT true, un devis non officiel n'est jamais accepté ni marqué remis, DRAFT/ACCEPTED/CANCELLED, aucun nouveau compteur",
          f"{len(motifs2)} motifs cherchés dans la ligne aplatie ; manquants = {manque2}")
    q = blob("packages/types/src/quote.ts")
    m = re.search(r"export const QUOTE_WRITABLE_STATUSES = \[(.*?)\] as const", q, re.S)
    liste = re.findall(r"QuoteStatus\.(\w+)", m.group(1)) if m else []
    noter("2.3", liste == ["DRAFT", "ACCEPTED", "CANCELLED"], "QUOTE_WRITABLE_STATUSES = DRAFT, ACCEPTED, CANCELLED (packages/types/src/quote.ts)", f"liste lue = {liste}")
    dr1 = aplati(next((l for l in lignes(CONT) if l.startswith("DR1. ")), ""))
    noter("2.4", "En pause : passes de certification au repos" in dr1 and "sessions B d'attaque à froid" in dr1 and "les tests rouges d'abord quand la méthode est RENFORCÉE" in dr1,
          "DR1 : en pause, les passes de certification et les sessions B ; conservés, les tests rouges d'abord (RENFORCÉE)", f"ligne DR1 aplatie : {len(dr1)} caractères parcourus")
    dr8 = aplati(next((l for l in lignes(CONT) if l.startswith("DR8. ")), ""))
    noter("2.5", "Tout schéma est ratifié par Ko avant sa migration" in dr8 and "s'arrête et présente l'écart" in dr8,
          "DR8 : tout schéma est ratifié avant sa migration ; une session qui doit s'en écarter s'arrête et présente l'écart", f"ligne DR8 aplatie : {len(dr8)} caractères parcourus")
    ks = aplati(blob("docs/preuves/D337/scenarios-ko.md"))
    gestes = re.findall(r"(?:^|\s)([1-6])\. \*\*", blob("docs/preuves/D337/scenarios-ko.md").replace("\n", " \n"))
    noter("2.6", len(set(gestes)) == 6, "docs/preuves/D337/scenarios-ko.md porte les six gestes de Ko", f"{len(blob('docs/preuves/D337/scenarios-ko.md').splitlines())} lignes parcourues ; gestes numérotés = {sorted(set(gestes))}")
    d337 = aplati(blob("docs/preuves/D337/table-ouverture.md"))
    noter("2.7", "xtension 5" in d337 and "6 jetons" in aplati(git("log", "--format=%s", "-n", "12", SHA_BASE)),
          "l'extension 5 de la table de D337 existe (masquage de 6 jetons d'une base jetable)", f"table D337 : {len(d337)} caractères aplatis ; `xtension 5` présent = {'xtension 5' in d337}")


def a_etat() -> None:
    cont = blob(CONT)
    ls = cont.splitlines()
    idx = [i for i, l in enumerate(ls[:2304]) if re.search(r"⇒ \*\*RANG \d+", l)]
    derniere = ls[idx[-1]] if idx else ""
    noter("3.1", "RANG 43" in derniere and "EN ATTENTE D'ARBITRAGE DE KO" in derniere, "la dernière ligne « ⇒ RANG » de l'ordre des rangs est « RANG 43 : EN ATTENTE D'ARBITRAGE DE KO »",
          f"{len(ls[:2304])} lignes de l'ordre des rangs parcourues ; {len(idx)} lignes « ⇒ RANG » ; dernière = ligne {idx[-1] + 1 if idx else '?'} : « {derniere[:80]} »")
    sec = aplati(cont)
    noter("3.2", "POUR MÉMOIRE UN → DEUX" in sec, "le compteur pour mémoire est à DEUX à la clôture du rang 42", f"texte aplati de {len(sec)} caractères ; motif `POUR MÉMOIRE UN → DEUX` présent = {'POUR MÉMOIRE UN → DEUX' in sec}")
    manque = [f"S-{n}" for n in range(68, 76) if not re.search(rf"\*\*S-{n}\*\*", cont)]
    noter("3.3", not manque, "S-68 à S-75 existent dans la section D337", f"8 identifiants cherchés sous la forme `**S-nn**` ; manquants = {manque}")
    back = aplati(blob(BACK))
    noter("3.4", "bookings_contact_reachable" in back and not re.search(r"bookings_contact_reachable[^.]{0,200}teste NULL seulement", back),
          "l'entrée « le CHECK teste NULL seulement » (R-3) n'existe pas encore au backlog (elle sera ajoutée, pas dupliquée)", f"texte du backlog : {len(back)} caractères aplatis")
    sql = sans_commentaires_sql(blob("apps/api/prisma/migrations/20261024100000_booking_contact_phone_optional/migration.sql"))
    chk = re.search(r'CHECK\s*\((.*?)\);', sql, re.S)
    corps = aplati(chk.group(1)) if chk else ""
    noter("3.5", corps == '"contact_phone" IS NOT NULL OR "contact_email" IS NOT NULL' and "btrim" not in corps and "<> ''" not in corps,
          "le CHECK de la migration 20261024100000 ne teste que NULL (aucun test de chaîne vide)", f"instruction CHECK lue (commentaires retirés) = « {corps} »")
    init = sans_commentaires_sql(blob("apps/api/prisma/migrations/20260707000000_init/migration.sql"))
    noter("3.6", re.search(r'"contact_phone"\s+TEXT\s+NOT NULL', init) is not None, "contact_phone était NOT NULL (donc la chaîne vide passait déjà) dans la migration d'origine", f"{len(init.splitlines())} lignes SQL parcourues")
    noms = git("ls-tree", "-r", "--name-only", SHA_BASE, "apps/api/prisma/migrations/").splitlines()
    avant = [n for n in noms if n.endswith("migration.sql") and n.split("/")[-2] < "20261024100000_booking_contact_phone_optional"]
    contraintes = [n.split("/")[-2] for n in avant if re.search(r"CHECK[^;]*contact_phone", sans_commentaires_sql(blob(n)))]
    noter("3.7", contraintes == [], "aucune migration AVANT 20261024100000 ne pose un CHECK sur contact_phone (la chaîne vide n'a jamais été refusée par la base)", f"{len(avant)} migrations parcourues ; porteuses d'un CHECK sur contact_phone = {contraintes}")
    nb6 = [l for l in lignes(BACK) if "NB-6" in l and "A-13" in l]
    noter("3.8", len(nb6) == 1 and "À ordonner par Ko" in nb6[0].replace("à ordonner par Ko", "À ordonner par Ko"), "NB-6 est une entrée ouverte du backlog « à ordonner par Ko »", f"lignes du backlog portant NB-6 et A-13 : {len(nb6)}")


def main() -> None:
    sortie = None
    if "--sortie" in sys.argv:
        sortie = sys.argv[sys.argv.index("--sortie") + 1]
    cal = calibrer()
    a_depart()
    a_lignes_citees()
    a_decisions_citees()
    a_etat()
    n = len(RESULTATS)
    ok = sum(1 for r in RESULTATS if r[1] == "✓")
    ko = sum(1 for r in RESULTATS if r[1] == "✗")
    inc = sum(1 for r in RESULTATS if r[1] == "?")
    out = [f"LECTURE ADVERSE DE LA CONSIGNE DU RANG 43 (D338) — instrument confronter-consigne.py, SHA de base {SHA_BASE}", cal, "",
           "══ PREMIÈRE PARTIE — COURTE ══",
           f"{n} contrôles parcourus : {ok} ✓ · {ko} ✗ · {inc} ? (attendu : tous ✓, ou chaque ✗ expliqué en seconde partie)", "",
           "══ SECONDE PARTIE — EN ENTIER ══"]
    for ident, verdict, affirmation, detail in RESULTATS:
        out.append(f"{verdict} [{ident}] {affirmation}")
        out.append(f"     ↳ {detail}")
    texte = "\n".join(out) + "\n"
    print(texte, end="")
    if sortie:
        with open(sortie, "w", encoding="utf-8", newline="\n") as f:
            f.write(texte)
    sys.exit(0 if ko == 0 and inc == 0 else 1)


if __name__ == "__main__":
    main()
