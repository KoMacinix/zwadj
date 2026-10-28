#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 43 (SUITE, L36-2 : le CODE) contre le dépôt — D339 (forme ALLÉGÉE).

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D339/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il ne lit que des OBJETS GIT à SHA fixe (SHA_BASE = d703117, l'état de DÉPART du lot) et n'écrit rien d'autre que, si `--sortie` est
donné, le fichier de sortie (UTF-8, écrit par le script lui-même : jamais par redirection du shell — PowerShell 5.1 réencode).

POURQUOI IL EXISTE : la consigne demande une lecture adverse « contre le dépôt ». Chaque affirmation VÉRIFIABLE est ici une fonction
qui rend (verdict, détail), et le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

FORME ALLÉGÉE : les affirmations de la consigne uniquement (numéros de ligne, citations, état de départ, règles et décisions citées).
Les MESURES du cadrage vivent dans `docs/preuves/D338/` ; elles ne sont pas des affirmations de cette consigne.

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D338/lecture-adverse/confronter-consigne.py` tel quel — il est collé aux affirmations de
D338 (SHA de base 985fd20, dernier numéro D337, table commitée `636f830`) ; en reprendre les extracteurs aurait importé leurs
hypothèses. Seuls les PRINCIPES sont repris : texte APLATI avant toute recherche multi-mots (AGENTS.md, D277/D294), jamais de comptage
par sous-chaîne sans contexte (D275), un littéral cherché dans un fichier NOMMÉ a ses deux bras (présent / absent).

CALIBRATION (D286 : deux bras, et il ABANDONNE si un cas manque son verdict) : un cas VRAI connu doit rendre ✓, un cas FAUX connu
doit rendre ✗, avant toute affirmation de la consigne.

CE QUI N'EST PAS VÉRIFIABLE CONTRE LE DÉPÔT (rendu « ? », jamais « ✓ ») : les paroles de Ko et du relecteur (le chat n'est pas au dépôt),
le rejeu du spike avec un autre Chromium (« headless_shell 1243 »), l'état de la machine du relecteur.
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "d703117"
SHA_TABLE = "fb386f1"

CONT = "ZWADJ_CONTINUITE.md"
BACK = "ZWADJ_BACKLOG.md"
CADRAGE = "docs/preuves/D338/cadrage.md"


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def blob(path: str, sha: str = SHA_BASE) -> str:
    return git("show", f"{sha}:{path}")


def aplati(texte: str) -> str:
    return re.sub(r"\s+", " ", texte)


def lignes(path: str) -> list[str]:
    return blob(path).splitlines()


RESULTATS: list[tuple[str, str, str, str]] = []  # (id, verdict, affirmation, détail)


def noter(ident: str, ok: bool | None, affirmation: str, detail: str) -> None:
    verdict = "✓" if ok is True else ("✗" if ok is False else "?")
    RESULTATS.append((ident, verdict, affirmation, detail))


def presente_dans(path: str, motif: str) -> bool:
    return motif in aplati(blob(path))


def calibrer() -> str:
    registre = aplati(blob(CONT))
    vrai = "| D338 | A |" in registre
    faux = "| D999 | A |" in registre
    if not (vrai is True and faux is False):
        print(f"CALIBRATION RATÉE : cas vrai → {vrai} (attendu True), cas faux → {faux} (attendu False). ABANDON.")
        sys.exit(3)
    vrai2 = presente_dans("packages/types/src/quote.ts", "export const quoteReviseSchema = quoteCreateSchema;")
    faux2 = presente_dans("packages/types/src/quote.ts", "export const quotePromoteSchema")
    if not (vrai2 is True and faux2 is False):
        print(f"CALIBRATION RATÉE (littéral dans un fichier) : cas vrai → {vrai2}, cas faux → {faux2}. ABANDON.")
        sys.exit(3)
    ls = lignes("packages/types/src/quote.ts")
    vrai3 = len(ls) >= 408 and ls[407].strip() == "export const quoteReviseSchema = quoteCreateSchema;"
    faux3 = len(ls) >= 409 and ls[408].strip() == "export const quoteReviseSchema = quoteCreateSchema;"
    if not (vrai3 is True and faux3 is False):
        print(f"CALIBRATION RATÉE (numéro de ligne) : ligne 408 → {vrai3}, ligne 409 → {faux3}. ABANDON.")
        sys.exit(3)
    return ("calibration : ligne D338 du registre → ✓ ; ligne D999 → ✗ ; `quoteReviseSchema = quoteCreateSchema` présent → ✓ ; "
            "`quotePromoteSchema` absent → ✗ ; ce littéral à la ligne 408 → ✓, à la ligne 409 → ✗ — les six bras tiennent.")


def ligne(path: str, n: int) -> str:
    ls = lignes(path)
    return ls[n - 1] if 0 < n <= len(ls) else ""


def a_depart() -> None:
    base = git("rev-parse", SHA_BASE).strip()
    parent = git("rev-parse", f"{SHA_TABLE}^").strip()
    noms = [n for n in git("show", "--name-only", "--format=", SHA_TABLE).splitlines() if n.strip()]
    noter("0.1", parent == base and noms == ["docs/preuves/D339/table-ouverture.md"],
          "le premier commit du lot (la table) a pour parent d703117 et ne contient que table-ouverture.md",
          f"{SHA_BASE} → {base[:12]} ; parent de {SHA_TABLE} = {parent[:12]} ; fichiers du commit = {noms}")
    noter("0.2", git("stash", "list").strip() == "", "aucun stash", f"`git stash list` = {git('stash', 'list').strip() or 'vide'}")
    noter("0.3", git("branch", "--show-current").strip() == "main", "branche main", f"branche = {git('branch', '--show-current').strip()}")
    origine = git("rev-parse", "origin/main").strip()
    noter("0.4", origine == base, "origin/main = d703117 (l'état de départ que la consigne annonce) au moment de la lecture, après `git fetch`",
          f"origin/main = {origine[:12]} ; d703117 = {base[:12]}")
    reg = [l for l in lignes(CONT) if re.match(r"^\| D\d+ \|", l)]
    dernier = re.match(r"^\| (D\d+) \|", reg[-1]).group(1)
    noter("0.5", dernier == "D338", "le dernier numéro du registre est D338 (attendu D339 pour ce lot)", f"{len(reg)} lignes de registre parcourues ; dernière = {dernier}")


def section_1() -> None:
    l2041 = ligne(CONT, 2041)
    noter("1.1", "Pour un vrai devis, il faut le numéro ou l'adresse e-mail" in l2041,
          "ZWADJ_CONTINUITE.md:2041 porte « Pour un vrai devis, il faut le numéro ou l'adresse e-mail »",
          f"{len(lignes(CONT))} lignes parcourues ; ligne 2041 = « {l2041.strip()[:150]} »")
    l2128 = ligne(CONT, 2128)
    noter("1.2", "[L36-2]" in l2128 and "is_official boolean NOT NULL DEFAULT true" in l2128 and "n'est jamais accepté ni marqué remis" in l2128,
          "la tranche [L36-2] (ZWADJ_CONTINUITE.md:2128) pose is_official DEFAULT true et « jamais accepté ni marqué remis »",
          f"ligne 2128 = « {l2128.strip()[:140]} … »")
    noter("1.3", "client_record_id" not in l2128 and "client_name" not in l2128,
          "la tranche [L36-2] ne parle NI de la fiche NI du nom : l'exigence Q2 (NULL pour un devis non officiel) est donc bien une EXTENSION, comme la consigne l'écrit",
          f"`client_record_id` et `client_name` cherchés dans la ligne 2128 ({len(l2128)} caractères parcourus) : absents")
    l2104 = ligne(CONT, 2104)
    noter("1.4", "ligne d'audit" in l2104 and "garde serveur + CHECK en base" in l2104 and "colonnes exactes à fixer par la lecture de deliver()" in l2104,
          "DR4 (ZWADJ_CONTINUITE.md:2104) : ligne d'audit ; garde serveur + CHECK en base ; colonnes à fixer par la lecture de deliver()",
          f"ligne 2104 parcourue ({len(l2104)} caractères)")
    t = blob(CONT)
    s49 = [m.start() for m in re.finditer(r"\*\*S-49\*\*", t)]
    ctx49 = aplati(re.search(r"^- \*\*S-49\*\*.*$", t, flags=re.M).group(0)) if s49 else ""
    noter("1.5", len(s49) == 1 and "les noms n'existent qu'avec une fiche" in ctx49 and "quoteReviseSchema = quoteCreateSchema" in ctx49 and "inchangé" in ctx49,
          "S-49 (rang 41) existe dans le .md : les noms n'existent qu'avec une fiche, et « une révision porte le même corps (quoteReviseSchema = quoteCreateSchema, inchangé) » — la phrase que R-1 CHANGE pour `isOfficial` (à annoter, D277)",
          f"{len(s49)} occurrence(s) de **S-49** ; texte de la puce = « {ctx49[:330]} »")
    # La consigne écrit « L'API garde le devis officiel sans fiche (S-49, rang 41) » : la puce S-49 du .md ne dit pas « sans fiche » en toutes lettres ; c'est le CODE qui porte
    # cette étiquette (défaut de la première passe : le contrôle 1.5 cherchait la clause dans la puce — voir defauts-instrument.txt). On confronte donc le code.
    etiquettes = [l for l in git("grep", "-n", "S-49", SHA_BASE, "--", "apps", "packages").splitlines()
                  if re.search(r"SANS fiche|Sans fiche", l)]
    noter("1.5b", len(etiquettes) >= 2,
          "le CODE étiquette S-49 sur « un devis peut naître SANS fiche » (de quoi lire la consigne : « L'API garde le devis officiel sans fiche (S-49) »)",
          f"`git grep -n S-49` à {SHA_BASE} sur apps et packages ; lignes qui portent aussi « sans fiche » : {[l.split(':', 2)[1] + ':' + l.split(':', 2)[2] for l in etiquettes]}")
    l371 = ligne("packages/types/src/quote.ts", 371).strip()
    noter("1.5c", l371.startswith("clientRecordId: z.string().uuid(") and l371.endswith(".optional(),"),
          "le comportement : `clientRecordId` est FACULTATIF dans quoteCreateSchema (packages/types/src/quote.ts:371) — l'API crée donc un devis officiel sans fiche",
          f"ligne 371 = « {l371} »")
    # S-76 à S-82 : chacun UNE fois, en tête de puce, dans la section D338.
    ids = [f"S-{n}" for n in range(76, 83)]
    comptes = {i: len(re.findall(r"^- \*\*" + re.escape(i) + r"\*\*", t, flags=re.M)) for i in ids}
    noter("1.6", all(v == 1 for v in comptes.values()),
          "S-76 à S-82 (D338) existent, une fois chacune, en tête de puce",
          f"puces comptées = {comptes}")
    m80 = re.search(r"^- \*\*S-80\*\*(.*)$", t, flags=re.M)
    txt80 = aplati(m80.group(1)) if m80 else ""
    noter("1.7", "POST /quotes/:id/promote" in txt80 and "isOfficial: false" in txt80,
          "S-80 : la promotion est `POST /quotes/:id/promote` et le champ de création n'accepte que `isOfficial: false` (les précisions R-1 et R-2 la complètent)",
          f"S-80 = « {txt80[:300]} »")
    mig = blob("apps/api/prisma/migrations/20261015100000_venue_number/migration.sql")
    noter("1.8", "venues_number_immutable" in mig and re.search(r"CREATE\s+(OR REPLACE\s+)?TRIGGER", mig, flags=re.I) is not None,
          "le précédent du déclencheur existe : `venues_number_immutable`, migration 20261015100000",
          f"{len(mig.splitlines())} lignes de migration parcourues ; `venues_number_immutable` présent ; CREATE TRIGGER présent")


def section_2() -> None:
    noter("2.1", ligne("packages/types/src/quote.ts", 408).strip() == "export const quoteReviseSchema = quoteCreateSchema;",
          "packages/types/src/quote.ts:408 : quoteReviseSchema = quoteCreateSchema",
          f"ligne 408 = « {ligne('packages/types/src/quote.ts', 408).strip()} »")
    ctrl = "apps/api/src/venues/quotes.controller.ts"
    l168, l185 = ligne(ctrl, 168).strip(), ligne(ctrl, 185).strip()
    noter("2.2", l168 == '@Post("quotes/:id/client-name")' and l185 == "}",
          "quotes.controller.ts:168-185 = la route K-5 (`POST /quotes/:id/client-name`), de son décorateur à son accolade fermante",
          f"{len(lignes(ctrl))} lignes parcourues ; ligne 168 = « {l168} » ; ligne 185 = « {l185} »")
    store = "apps/api/src/venues/quote-store.prisma.ts"
    ls = lignes(store)
    l316, l323 = (ls[315] if len(ls) > 315 else ""), (ls[322] if len(ls) > 322 else "")
    noter("2.3", "MD-7" in l316 and "if (devis.clientRecordId !== null)" in l323,
          "quote-store.prisma.ts:316-323 : la copie du nom s'écrit d'abord (compare-and-set), la fiche n'est lue que si `clientRecordId` n'est pas NULL",
          f"{len(ls)} lignes parcourues ; ligne 316 = « {l316.strip()[:80]} » ; ligne 323 = « {l323.strip()} »")
    corps = "\n".join(ls[314:340])
    pos_ecriture = corps.find("tx.quote.updateMany")
    pos_fiche = corps.find("clientRecordId !== null")
    noter("2.4", 0 <= pos_ecriture < pos_fiche,
          "R-3 (motif) : K-5 écrit la copie du nom AVANT de regarder la fiche — donc sur un devis SANS fiche aussi",
          f"lignes 315-340 parcourues ; `tx.quote.updateMany` à l'offset {pos_ecriture}, `clientRecordId !== null` à l'offset {pos_fiche}")
    cad = blob(CADRAGE)
    noter("2.5", "D-7" in cad and "révision d'un brouillon" in aplati(cad),
          "« D-7 du cadrage » existe et traite la révision d'un brouillon (drapeau hérité de la dernière version)",
          f"{len(cad.splitlines())} lignes du cadrage parcourues ; `D-7` et « révision d'un brouillon » présents")
    fixed = re.search(r"français, 70 prestations, `fixed` \| (\d+) \| (\d+)", cad)
    absolu = re.search(r"français, 70 prestations, \*\*`absolute`\*\* \(mutation, bras faux\) \| (\d+) \| (\d+)", cad)
    noter("2.6", fixed is not None and absolu is not None and (fixed.group(1), absolu.group(1)) == ("4", "3"),
          "R-5 (motif) : dans le spike de D338, la mutation `absolute` fait passer le document de 4 à 3 pages",
          f"ligne `fixed` = {fixed.groups() if fixed else None} (pages, couleurs) ; ligne `absolute` = {absolu.groups() if absolu else None}")
    schema = blob("apps/api/prisma/schema.prisma")
    noter("2.7", re.search(r'quoteId\s+String\?\s+@unique\s+@map\("quote_id"\)', schema) is not None,
          "R-4 (motif) : `bookings.quote_id` existe et est UNIQUE (une réservation peut y être rattachée après coup par un UPDATE)",
          f"{len(schema.splitlines())} lignes de schéma parcourues ; `quoteId String? @unique @map(\"quote_id\")` présent")


def section_3() -> None:
    mes = blob("docs/preuves/D338/mesures-cadrage.txt")
    bloc = mes[mes.find("M10 —"):mes.find("M11 —")]
    comptes = re.findall(r"^\s+(\d+) (apps/api/test/int/\S+)$", bloc, flags=re.M)
    total = sum(int(n) for n, _ in comptes)
    noter("3.1", len(comptes) >= 3 and total == 9,
          "3 a : « au moins 3 fichiers d'intégration, 9 appels HTTP : relevé partiel de D338, M10 »",
          f"M10 parcourue : {len(comptes)} fichiers {[(f.split('/')[-1], int(n)) for n, f in comptes]} ; total = {total}")
    noter("3.2", presente_dans(CADRAGE, "D-14") and not presente_dans(CADRAGE, "D-15"),
          "3 b : les modes de défaillance du cadrage de D338 vont de D-1 à D-14 ; D-15 à D-19 sont donc NEUFS",
          "`D-14` présent, `D-15` absent du cadrage")
    noter("3.3", len(re.findall(r"^\| D-\d+ \|", blob(CADRAGE), flags=re.M)) == 14,
          "3 b : le cadrage compte exactement 14 lignes de modes de défaillance",
          f"{len(re.findall(r'^[|] D-[0-9]+ [|]', blob(CADRAGE), flags=re.M))} lignes `| D-n |` parcourues")
    noter("3.4", re.search(r"^## D338\b|^## .*D338", blob(CONT), flags=re.M) is not None or "D338 — rang 43" in blob(CONT),
          "3 c : la section D338 existe dans ZWADJ_CONTINUITE.md (de quoi lui ajouter une annotation)",
          "un titre ou une ligne « D338 — rang 43 » est présent")
    bk = blob(BACK)
    noter("3.5", "L36-2" in bk and "[ ]" in bk,
          "3 a : le backlog existe et porte déjà l'entrée L36-2 (celle de 3 a est une entrée DE PLUS, sans rang)",
          f"{len(bk.splitlines())} lignes de backlog parcourues ; `L36-2` présent")


def section_4_5() -> None:
    mes = blob("docs/preuves/D338/mesures-cadrage.txt")
    bloc = mes[mes.find("M3 —"):mes.find("M4 —")]
    noter("4.1", "[sortie : 0 ligne(s)]" in bloc and "model AuditLog" in bloc,
          "4 : la promotion serait la PREMIÈRE écriture de audit_logs (M3 : le modèle existe, zéro écrivain)",
          "M3 parcourue : `model AuditLog` trouvé ; la recherche d'un écrivain rend 0 ligne")
    # Contre-mesure directe, à SHA fixe, sur le code de production (pas seulement sur la pièce de D338).
    sortie = git("grep", "-n", "-i", "-E", "auditLog|audit_log", SHA_BASE, "--", "apps/api/src")
    prod = [l for l in sortie.splitlines() if "/generated/" not in l and ".spec.ts" not in l]
    noter("4.2", len(prod) == 0, "idem, mesuré directement à d703117 : aucune référence à auditLog / audit_log dans apps/api/src (hors client généré et specs)",
          f"`git grep` à {SHA_BASE} : {len(sortie.splitlines())} ligne(s) brutes, {len(prod)} après retrait du client généré et des specs")
    cont = blob(CONT)
    noter("4.3", re.search(r"^## .*ORDRE DES RANGS", cont, flags=re.M) is not None and "RANG 43" in cont,
          "5 : l'ordre des rangs existe et nomme le rang 43 (de quoi écrire « RANG 43 : CLOS SUR LE CODE » puis « RANG 44 : EN ATTENTE D'ARBITRAGE DE KO »)",
          "un titre « ORDRE DES RANGS » et « RANG 43 » sont présents")
    agents = blob("AGENTS.md")
    noter("4.4", "compteur POUR MÉMOIRE **DEUX, inchangé**" in agents,
          "5 : le compteur pour mémoire est DEUX au départ (D338) — il passe donc à TROIS à la clôture de ce lot de code",
          "la chaîne du compteur de AGENTS.md porte « compteur POUR MÉMOIRE DEUX, inchangé » (D338)")
    noter("4.5", "TOUTE ÉCRITURE SUR LA BASE DE DÉVELOPPEMENT DE KO EST DÉCLARÉE AU RAPPORT DE FIN DE LOT" in aplati(agents),
          "5 : la règle permanente « toute écriture sur la base de développement de Ko est déclarée au rapport de fin de lot » est dans AGENTS.md",
          f"AGENTS.md parcouru ({len(agents.splitlines())} lignes) : la règle de D337 est présente, en majuscules")
    noter("4.6", "D334, item 5" in agents or "[D334, item 5]" in agents,
          "0 : la règle « les rouges avant le code » (D334, item 5) est écrite dans AGENTS.md",
          "AGENTS.md parcouru : `D334, item 5` présent")
    mes13 = blob("docs/preuves/D338/mesures-cadrage.txt")
    noter("4.7", "M13 —" in mes13 and "[sortie : 0 ligne(s)]" in mes13[mes13.find("M13 —"):],
          "4 : aucun lecteur de PDF n'est une dépendance du dépôt (le test du filigrane lira les flux des pages sans dépendance neuve)",
          "M13 parcourue : la recherche d'un lecteur de PDF dans les package.json rend 0 ligne")


def non_verifiables() -> None:
    noter("N.1", None, "R-5 : « le relecteur a rejoué le spike de D338 avec un autre Chromium (headless_shell 1243) et retrouvé les six lignes à l'identique »",
          "NON VÉRIFIABLE contre le dépôt : le rejeu du relecteur n'y est pas versé. Le dépôt porte la sortie de D338 (4 et 3 pages, vérifiée en 2.6) ; la session REJOUE sa propre mesure (code compilé du dépôt) avant de s'appuyer sur R-5")
    noter("N.2", None, "Q1 à Q5, S-76 à S-82 : « par adoption de ce message (Ko l'a collé) »",
          "NON VÉRIFIABLE : le chat n'est pas au dépôt. Écrit comme ADOPTION, jamais comme une parole de Ko (consigne, section 1)")
    noter("N.3", None, "R-1 à R-5 : « décisions du relecteur (chat), déléguées par Ko »",
          "NON VÉRIFIABLE : même raison. Écrit « décision du relecteur (chat), déléguée par Ko »")


def main() -> int:
    sortie = None
    if "--sortie" in sys.argv:
        sortie = sys.argv[sys.argv.index("--sortie") + 1]
    cal = calibrer()
    a_depart()
    section_1()
    section_2()
    section_3()
    section_4_5()
    non_verifiables()
    out = []
    out.append(f"Lecture adverse de la consigne du rang 43 (SUITE, L36-2 : le CODE) — SHA de base {SHA_BASE}, table {SHA_TABLE}")
    out.append(cal)
    out.append("")
    n_ok = sum(1 for r in RESULTATS if r[1] == "✓")
    n_ko = sum(1 for r in RESULTATS if r[1] == "✗")
    n_nv = sum(1 for r in RESULTATS if r[1] == "?")
    out.append(f"BILAN : {len(RESULTATS)} contrôles — {n_ok} ✓, {n_ko} ✗, {n_nv} non vérifiables (attendu ✗ : 0 ; chaque ✗ arrête la session).")
    out.append("")
    for ident, verdict, aff, detail in RESULTATS:
        out.append(f"[{verdict}] {ident} — {aff}")
        out.append(f"      {detail}")
    texte = "\n".join(out) + "\n"
    print(texte)
    if sortie:
        with open(sortie, "w", encoding="utf-8", newline="\n") as f:
            f.write(texte)
    return 1 if n_ko else 0


if __name__ == "__main__":
    sys.exit(main())
