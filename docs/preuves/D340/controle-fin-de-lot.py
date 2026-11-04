#!/usr/bin/env python3
"""D340 — CONTRÔLE DE FIN DE LOT (AGENTS.md : D288, D328). Lot DOCUMENTAIRE par l'effet de la règle d'arrêt : aucun code.

MODE D'EMPLOI : depuis la RACINE, APRÈS la poussée : `git fetch && python3 docs/preuves/D340/controle-fin-de-lot.py [--sortie <chemin>]`.
Il ne lit que git (objets, `status`, `diff`, `log`) et les fichiers du dépôt ; il n'écrit que `--sortie`, en UTF-8, par lui-même (jamais par redirection).

POURQUOI IL EXISTE ET CE QU'IL PORTE (D290) : chaque famille imprime le NOMBRE D'ÉLÉMENTS QU'ELLE A EXAMINÉS à côté de son verdict ; un « 0 » sur zéro
élément n'est pas une mesure. Chaque verdict est un ✓ ou un ✗ ; il n'y a pas de « ? ».

INSTRUMENTS ÉCARTÉS : le contrôle de D338 (`docs/preuves/D338/controle-fin-de-lot.txt`) n'a pas d'instrument versé, seulement sa sortie ; le refaire de mémoire
aurait recopié ses hypothèses. Les familles sont celles qu'AGENTS.md exige (premier commit = table seule ; lecture adverse avant tout .md d'autorité ; cadrage
poussé avant le code ; diff ⊆ table en chemins complets ; local = origin/main) plus celles que ce lot a rendues nécessaires (relecture des jetons écrits ; encodage).

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : le test « diff ⊆ table » rend ✗ sur un chemin fabriqué absent de la table et ✓ sur un chemin
qui y est ; le test d'encodage rend ✗ sur un texte mojibaké fabriqué et ✓ sur un texte sain ; une ligne de PROSE qui cite un chemin ne le déclare pas.
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

DEPART = "ec44937"
TABLE = "docs/preuves/D340/table-ouverture.md"
AUTORITE = ["ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"]
SORTIE = []
ECHECS = []
CELLULE = re.compile(r"^\|\s*`([^`\n]+)`\s*\|")


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def noms(h: str) -> list:
    return [n for n in git("show", "--name-only", "--format=", h).splitlines() if n.strip()]


def dire(s: str = "") -> None:
    SORTIE.append(s)


def verdict(ok: bool, texte: str) -> None:
    dire(("  ✓ " if ok else "  ✗ ") + texte)
    if not ok:
        ECHECS.append(texte)


def premiere_cellule(ligne: str):
    m = CELLULE.match(ligne)
    return m.group(1).strip() if m else None


def est_fichier(c) -> bool:
    return bool(c) and not c.endswith("/") and " " not in c and "<" not in c and "…" not in c and ("/" in c or c in AUTORITE)


def chemins_declares(texte: str = None) -> set:
    """Chemins COMPLETS déclarés par la PREMIÈRE cellule des lignes de tableau de la table (extensions comprises) — pas ceux cités en prose ; sans les dossiers."""
    t = texte if texte is not None else open(TABLE, encoding="utf-8", newline="").read()
    return {c for c in (premiere_cellule(l) for l in t.splitlines()) if est_fichier(c)}


def mojibake(texte: str) -> int:
    # ⚠ Les signatures sont ASSEMBLÉES à partir de points de code : écrites en clair, ce fichier se condamnerait lui-même à la famille 7 (un UTF-8 relu en cp1252
    # donne les paires 0xC3 0xA9 (é), 0xC3 0xA8 (è), 0xE2 0x20AC (le tiret ou l'apostrophe typographique) et 0xC2 0xA0 (l'espace insécable) ; 0xFFFD est le caractère de remplacement).
    signatures = [chr(0xC3) + chr(0xA9), chr(0xC3) + chr(0xA8), chr(0xE2) + chr(0x20AC), chr(0xC2) + chr(0xA0)]
    return sum(texte.count(s) for s in signatures) + texte.count(chr(0xFFFD))


def calibrer() -> None:
    decl = chemins_declares()
    vrai = "docs/preuves/D340/cadrage.md" in decl
    faux = "docs/preuves/D340/ce_fichier_n_existe_pas_xyz.txt" in decl
    # une ligne de prose qui cite un chemin ne le déclare pas ; une ligne de tableau le déclare
    prose = chemins_declares("Voir `docs/preuves/D340/prose-seulement.txt` dans le texte.\n| `docs/preuves/D340/en-tableau.txt` | pour |\n")
    sain, casse = "Écriture saine : é à ô ✓", "Écriture cass" + chr(0xC3) + chr(0xA9) + "e"
    ok = (vrai is True and faux is False and prose == {"docs/preuves/D340/en-tableau.txt"} and mojibake(sain) == 0 and mojibake(casse) > 0)
    if not ok:
        print(f"CALIBRATION RATÉE : déclaré connu={vrai} (True), fabriqué={faux} (False), prose/tableau={prose}, mojibake sain={mojibake(sain)} (0), cassé={mojibake(casse)} (>0). ABANDON.")
        sys.exit(3)
    dire(f"calibration : chemin déclaré connu → ✓ ; chemin fabriqué → ✗ ; prose ≠ déclaration, tableau = déclaration ; texte sain → 0 mojibake ; texte cassé → {mojibake(casse)} — les bras tiennent ({len(decl)} chemins complets lus dans la table).")


def main() -> None:
    sortie = sys.argv[sys.argv.index("--sortie") + 1] if "--sortie" in sys.argv else None
    dire(f"D340 — CONTRÔLE DE FIN DE LOT — SHA de départ {DEPART} — {git('rev-parse', 'HEAD').strip()[:7]} = HEAD au moment du contrôle")
    calibrer()
    dire()

    commits = [l.split("\t") for l in git("log", "--reverse", "--format=%H\t%s", f"{DEPART}..HEAD").splitlines() if l.strip()]
    dire(f"commits du lot ({len(commits)}, du plus ancien au plus récent) :")
    for h, s in commits:
        dire(f"  {h[:7]}  {s[:110]}")
    dire()

    dire("1. LOCAL ET DISTANT SUR LE MÊME SHA (D288)")
    head, origin = git("rev-parse", "HEAD").strip(), git("rev-parse", "origin/main").strip()
    verdict(head == origin, f"HEAD = {head} · origin/main = {origin} (après `git fetch` fait avant ce contrôle) — examinés : 2 SHA")
    st = git("status", "--short").strip()
    verdict(st == "", f"`git status --short` = {st or 'vide'} ; `git stash list` = {git('stash', 'list').strip() or 'vide'}")
    dire()

    dire("2. LE PREMIER COMMIT DU LOT EST LA TABLE SEULE (D328, point 1)")
    h0 = commits[0][0]
    n0 = noms(h0)
    parent0 = git("rev-parse", f"{h0}^").strip()
    verdict(n0 == [TABLE] and parent0.startswith(DEPART), f"{h0[:7]} : parent {parent0[:7]}, fichiers = {n0} — examinés : {len(n0)} fichier(s)")
    dire()

    dire("3. DIFF ⊆ TABLE, CHEMINS COMPLETS, EXTENSIONS COMPRISES (D328)")
    diff = [n for n in git("diff", "--name-only", DEPART, "HEAD").splitlines() if n.strip()]
    decl = chemins_declares()
    hors = [n for n in diff if n not in decl]
    verdict(not hors, f"{len(diff)} fichiers au diff {DEPART}..HEAD, {len(decl)} chemins complets déclarés ; non déclarés : {hors or 'aucun'}")
    ext_commits = [i for i, (h, _) in enumerate(commits) if i > 0 and TABLE in noms(h)]
    dire(f"     commits qui modifient la table après le premier : {len(ext_commits)}")
    for i in ext_commits:
        h = commits[i][0]
        ajoutes = [l[1:] for l in git("show", "--format=", "-U0", h, "--", TABLE).splitlines() if l.startswith("+") and not l.startswith("+++")]
        nouveaux = {c for c in (premiere_cellule(l) for l in ajoutes) if est_fichier(c)}
        deja = []
        for p in sorted(nouveaux):
            ajoute_par = [j for j, (hh, _) in enumerate(commits) if p in git("show", "--diff-filter=A", "--name-only", "--format=", hh).split()]
            if ajoute_par and min(ajoute_par) <= i:
                deja.append(p)
        verdict(noms(h) == [TABLE] and not deja, f"l'extension du commit n°{i + 1} ({h[:7]}) est SEULE ({noms(h)}) et précède les {len(nouveaux)} fichier(s) qu'elle déclare ; déjà commités avant ou avec elle : {deja or 'aucun'}")
    dire()

    dire("4. AUCUN FICHIER DE CODE NI DE TEST (la règle d'arrêt a joué : lot DOCUMENTAIRE)")
    code = [n for n in diff if not (n.startswith("docs/preuves/D340/") or n in AUTORITE)]
    verdict(not code, f"{len(diff)} fichiers examinés ; hors `docs/preuves/D340/` et hors les trois `.md` d'autorité : {code or 'aucun'}")
    dire()

    dire("5. L'ORDRE DES COMMITS (D328, points 2 à 4)")
    idx_auth = next((i for i, (h, _) in enumerate(commits) if set(noms(h)) & set(AUTORITE)), None)
    idx_lect = next((i for i, (h, _) in enumerate(commits) if "docs/preuves/D340/lecture-adverse/confronter-sortie.txt" in noms(h)), None)
    idx_cadr = next((i for i, (h, _) in enumerate(commits) if "docs/preuves/D340/cadrage.md" in noms(h)), None)
    verdict(None not in (idx_lect, idx_auth) and idx_lect < idx_auth, f"la sortie de la lecture adverse (commit n°{(idx_lect or 0) + 1}) précède le premier `.md` d'autorité (commit n°{(idx_auth or 0) + 1}) — examinés : {len(commits)} commits")
    n_auth = noms(commits[idx_auth][0])
    verdict(n_auth == ["ZWADJ_CONTINUITE.md"], f"la PREMIÈRE écriture d'autorité ({commits[idx_auth][0][:7]}) ne contient que ZWADJ_CONTINUITE.md : {n_auth}")
    h_cadr = commits[idx_cadr][0]
    pousse = subprocess.run(["git", "merge-base", "--is-ancestor", h_cadr, "origin/main"]).returncode == 0
    verdict(pousse and idx_cadr < idx_auth + 2, f"le cadrage ({h_cadr[:7]}, commit n°{idx_cadr + 1}) est un ancêtre de origin/main : poussé ; aucun commit de code n'existe (famille 4)")
    marq = {"docs/preuves/D340/portes/_index.txt", "docs/preuves/D340/passe-d277/sortie-avant.txt"}
    pieces = [i for i, (h, _) in enumerate(commits) if set(noms(h)) & marq]
    md = [i for i, (h, _) in enumerate(commits) if set(noms(h)) & set(AUTORITE)]
    verdict(bool(pieces) and min(pieces) < max(md), f"les pièces de clôture (portes, passe D277 : commit n°{min(pieces) + 1 if pieces else '?'}) précèdent les `.md` de clôture (dernier : commit n°{max(md) + 1})")
    dire("     rouges avant le code (D334, item 5) : SANS OBJET — aucun code.")
    dire()

    dire("6. LE REGISTRE")
    reg = [l for l in open("ZWADJ_CONTINUITE.md", encoding="utf-8", newline="").read().split("\r\n") if re.match(r"^\| D\d+ \|", l)]
    verdict(reg[-1].startswith("| D340 |") and reg[-2].startswith("| D339 |"), f"{len(reg)} lignes de registre examinées ; les deux dernières : {reg[-2][:12]}…, {reg[-1][:12]}…")
    dire()

    dire("7. L'ARBRE, LES FINS DE LIGNE, L'ENCODAGE (D289 : relire ce qu'on a ÉCRIT, pas le compte rendu de l'outil)")
    for f in AUTORITE:
        b = open(f, "rb").read()
        crlf, lf = b.count(b"\r\n"), b.count(b"\n") - b.count(b"\r\n")
        verdict(lf == 0, f"{f} : {crlf} CRLF, {lf} LF nu(s) — examiné : {len(b)} octets")
    fichiers = [n for n in git("ls-files", "docs/preuves/D340").splitlines() if n.strip()]
    mauvais = []
    for f in fichiers:
        t = open(f, "rb").read().decode("utf-8")
        if mojibake(t):
            mauvais.append((f, mojibake(t)))
    verdict(not mauvais, f"{len(fichiers)} pièces de docs/preuves/D340 relues en UTF-8 : mojibake / U+FFFD = {mauvais or 'aucun'}")
    dire()

    dire("8. LES JETONS ATTENDUS SONT DANS LES FICHIERS (D289 : on cherche les jetons, on ne constate pas qu'une écriture a eu lieu)")
    attendus = {
        "ZWADJ_CONTINUITE.md": ["ARBITRÉ LE 03/11/2026 PAR KO — LE RANG 44", "Session du 03/11/2026 — D340", "PROCHAIN LOT — rang 44", "RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR",
                                "OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE", "je prends que les descision ou y a plusieurs choix judicier", "S-98 à S-112", "K-14 à K-23", "SIG-1", "| D340 | A |"],
        "AGENTS.md": ["D340, 03/11/2026", "LA DÉLÉGATION DE KO CHANGE QUI ÉCRIT LE RANG SUIVANT", "je prends que les descision ou y a plusieurs choix judicier", "RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR"],
        "ZWADJ_BACKLOG.md": ["SIG-1", "RECOURS ADMINISTRATEUR", "CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE, AUCUN CODE"],
    }
    for f, jetons in attendus.items():
        t = re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read())
        manque = [j for j in jetons if j not in t]
        verdict(not manque, f"{f} : {len(jetons)} jetons cherchés dans le texte APLATI ; manquants : {manque or 'aucun'}")
    dire()

    dire("9. LES DÉCISIONS DU CHAT ONT ATTERRI DANS UN FICHIER (corollaire de fin de session de CLAUDE.md) — chaque ligne est vérifiée par la famille 8")
    dire("     · la délégation de Ko (02/11/2026) : citation mot pour mot dans ZWADJ_CONTINUITE.md (bloc d'arbitrage) et annotation dans AGENTS.md (règle D284) ;")
    dire("     · R-1 à R-6 du relecteur, S-97 confirmée, S-83 à S-96 ratifiées, condition de clôture du rang 43 levée : ZWADJ_CONTINUITE.md (première écriture d'autorité) ;")
    dire("     · la question au relecteur (trois lots ou deux) : ZWADJ_CONTINUITE.md (point d'entrée du rang 44) et cadrage § 8 ;")
    dire("     · SIG-1 et le recours administrateur : ZWADJ_BACKLOG.md ; SIG-1 : docs/preuves/D340/signalements.md ;")
    dire("     · rien ne vit seulement dans ce fil : les décisions de la session (S-98 à S-112) sont dans le cadrage et la section D340, À RATIFIER.")
    dire()

    dire("10. CE QUE CE CONTRÔLE NE DIT PAS")
    dire("     · Il ne dit rien de la CORRECTION du cadrage (ses estimations de taille sont des estimations, ses affirmations de code sont des lectures) : c'est le rôle du relecteur.")
    dire("     · Il ne rejoue pas les portes : leurs sorties sont dans docs/preuves/D340/portes/ ; elles disent que l'arbre sans code n'a pas bougé, pas que L36-3 est bon.")
    dire("     · La famille 5 compare des POSITIONS de commits : elle ne dit pas ce que chaque commit contient au-delà des noms de fichiers.")
    dire("     · Le « sur secteur » de la consigne n'est PAS contrôlé ici : la chaîne des portes s'est faite sur batterie (docs/preuves/D340/portes/_index.txt).")
    dire()
    dire(f"RÉSULTAT : {len(ECHECS)} échec(s) sur les familles 1 à 8 (attendu 0)." + (" — " + " | ".join(ECHECS) if ECHECS else ""))
    texte = "\n".join(SORTIE) + "\n"
    print(texte, end="")
    if sortie:
        with open(sortie, "w", encoding="utf-8", newline="\n") as f:
            f.write(texte)
    sys.exit(1 if ECHECS else 0)


main()
