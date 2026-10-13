"""D330 — lecture adverse de D329 (rang 36, passe r36a : la certification qui couvre D325 et D326, MARQUE REFUSÉE), confrontée aux objets git à des SHA FIXÉS et aux pièces versées.

POURQUOI IL EXISTE
  Forme de Ko pour la reprise du rang 36 : « la lecture adverse depuis la clôture de D329, EN ENTIER, et EN ENTIER dans ton rapport final ; instrument versé ; objets git lus à des SHA fixés ; chaque
  extracteur calibré sur un cas vrai et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré ; aucune porte ni campagne rejouée.
  En particulier : chaque chiffre du tableau « prédit / mesuré » de D329 contre ses pièces ; le diagnostic du `.env` (2 échecs sur 10, puis 10 sur 10) contre ses pièces ; les copies d'outillage de
  D329 (calibration et différences avec l'original) ; le correctif du retour chariot de l'extension 2 (`1235ef4`) ; le premier commit, le diff inclus dans la table. »
  Le dernier commit de D329 est sa clôture (`8f53011`) ; aucun commit ne la suit sinon la table d'ouverture de CE lot (`12de7c2`, qui ne contient qu'elle). Chaque affirmation de D329 qui se
  vérifie dans le dépôt est confrontée à sa SOURCE : les pièces versées, les objets git, le texte des fichiers d'autorité. Une affirmation qui ne vit que dans le chat, ou dans un journal hors
  dépôt, est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D330/lecture-adverse/confronter-d329.py > docs/preuves/D330/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF : (1) la famille X (état LIVE : `git status`, `stash`, `fetch`, `rev-parse`, reflog) ;
  (2) la famille E (état VIVANT des fichiers `.env` du poste : empreinte SHA-256, taille, date, et la CLASSE de l'hôte de chaque variable d'URL — AUCUNE valeur n'est lue dans la sortie, aucun hôte non
  local n'est imprimé : le dépôt est public) ; (3) les fins de ligne des trois `.md` (famille P), lues sur l'arbre. AUCUN rejeu de porte ni de campagne ici.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d328.py` (D329) — il juge D328 et ses SHA ; réutiliser `lire-campagnes.py` ou `lire-portes.py` comme preuve de D329 — ce serait croire l'instrument qu'on juge :
  les chiffres des pièces sont ici RECOMPTÉS PAR DES EXPRESSIONS ÉCRITES ICI (journaux relus en entier, ANSI retiré, `etat.csv` recompté ligne à ligne), indépendantes de celles de D329. Les assistants
  (`ctl`, calibration à deux bras, textes aplatis) sont ceux de D329, RÉÉCRITS ici : aucun import, l'instrument de D329 reste une pièce.

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils
  ont PARCOURU et leur attendu à côté (D290), le total des contrôles avec sa ventilation par famille (D295). Un attendu est DÉRIVÉ d'une pièce brute ou du texte de D329 — jamais écrit de mémoire (D275).
"""
import csv
import difflib
import hashlib
import os
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

FIN = "8f53011"       # clôture de D329
DEPART = "d468064"    # SHA de départ de D329 = clôture de D328
OUV329 = "7e8f948"    # la table d'ouverture de D329 (seule)
PROTO = "4202dd4"     # le protocole de D329 = le SHA de sa passe
OUV330 = "12de7c2"    # la table d'ouverture de CE lot (seule)
D324 = "257471d"      # SHA de la passe de D324 (les 26 planchers repris viennent de là)
PD = "docs/preuves/D329"
PASSE = PD + "/passe-r36a-20261012-1651"
CONT, AGENTS, BACKLOG = "ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"
AUTORITES = (AGENTS, BACKLOG, CONT)
ANSI = re.compile(r"\x1b\[[0-9;]*m")

controles, ecarts, constats, ecarts_live, non_verifiables = [], [], [], [], []
familles: dict = {}


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show(sha, chemin):
    return git("show", f"{sha}:{chemin}").decode("utf-8", errors="replace").replace("\r\n", "\n")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def blob(sha, chemin):
    return git("rev-parse", f"{sha}:{chemin}").decode().strip()


def aplati(t):
    return re.sub(r"\s+", " ", t)


def norm(t):
    """Espaces insécables (U+00A0, U+202F) ramenés à l'espace simple — le texte de D329 écrit « 1 718 » avec l'un ou l'autre."""
    return t.replace(" ", " ").replace(" ", " ")


def sans_ansi(t):
    return ANSI.sub("", t)


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_live if ident[0] in "XE" else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:7} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:7} CONSTAT : {texte}")


def non_verifiable(ident, texte):
    non_verifiables.append(ident)
    print(f"? {ident:7} NON VÉRIFIABLE : {texte}")


# ── Extracteurs (chacun calibré plus bas) ────────────────────────────────────────────────────────────────────────────
def chemins_table(texte):
    """Les chemins en tête de ligne d'un tableau Markdown : `| \\`chemin\\` | … |` (peut en citer plusieurs séparés par une virgule). Ordre d'apparition, sans doublon, SANS retouche
    (un retour chariot dans un chemin est CONSERVÉ : c'est ce que la lecture doit voir)."""
    sortie = []
    for l in texte.split("\n"):
        m = re.match(r"\|\s*((?:`[^`|]+`(?:,\s*)?)+)\s*\|", l)
        if m:
            for c in re.findall(r"`([^`]+)`", m[1]):
                if c not in sortie and ("/" in c or c.endswith(".md")):
                    sortie.append(c)
    return sortie


def lignes_de_table(texte):
    """Les lignes de tableau dont la première cellule est un chemin entre accents graves, ligne entière, ordre d'apparition (doublons conservés)."""
    return [l for l in texte.split("\n") if re.match(r"\|\s*`[^`|]+`", l)]


def bloc_entre(texte, debut, fin):
    i = texte.find(debut)
    if i < 0:
        return None
    j = texte.find(fin, i + len(debut))
    return texte[i : j if j >= 0 else len(texte)]


def entiers(s):
    """Les entiers d'un texte, espaces de milliers acceptés (« 5 504 » → 5504, « 1 718 / 136 » → 1718, 136), décimales à virgule ignorées (« 4,5 » ne donne pas 4 et 5 → on les retire d'abord)."""
    s = re.sub(r"\d{1,3}(?: \d{3})+,\d+|\d+,\d+", " ", norm(s))
    return [int(x.replace(" ", "")) for x in re.findall(r"\d{1,3}(?: \d{3})+(?!\d)|\d+", s)]


def decimaux(s):
    return [float(x.replace(",", ".")) for x in re.findall(r"\d+(?:,\d+)?", norm(s).replace(" ", ""))] if s else []


def bilans_vitest(t):
    """Chaque couple de lignes « Test Files … » / « Tests … » d'un journal vitest, dans l'ordre : ((fichiers passés, en échec, total), (tests passés, en échec, total))."""
    t = sans_ansi(t)
    fl = re.findall(r"^\s*Test Files\s+(.*)$", t, re.M)
    tl = re.findall(r"^\s*Tests\s+(.*)$", t, re.M)

    def lire(s):
        p, f, tot = re.search(r"(\d+) passed", s), re.search(r"(\d+) failed", s), re.search(r"\((\d+)\)", s)
        return (int(p[1]) if p else 0, int(f[1]) if f else 0, int(tot[1]) if tot else None)

    return [(lire(a), lire(b)) for a, b in zip(fl, tl)]


def compte_done(t):
    return len(re.findall(r"^.*: Done$", sans_ansi(t), re.M))


def erreurs_ts(t):
    return len(re.findall(r"error TS\d+", sans_ansi(t)))


def duree_code(t):
    """(secondes, code) de la ligne « fin … · N s · code C » d'un fichier .heures."""
    m = re.search(r"· (\d+) s · code (-?\d+)", t)
    return (int(m[1]), int(m[2])) if m else None


def resume_tout(t):
    """(mordues, muettes, non mesurées, campagnes, secondes) de la ligne « MESURÉ : … » du tri."""
    m = re.search(r"MESURÉ : (\d+) garde\(s\) mordue\(s\) · (\d+) muette\(s\)/erreur\(s\) · (\d+) non mesurée\(s\) · (\d+) campagne\(s\) · (\d+)s", sans_ansi(t))
    return tuple(int(x) for x in m.groups()) if m else None


def gardes_mordues(t):
    """(mordues, cibles) de la ligne « N garde(s) mordue(s) sur M cible… » d'un harnais."""
    m = re.search(r"^(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", sans_ansi(t), re.M)
    return (int(m[1]), int(m[2])) if m else None


def comptes_inventaire(t):
    return {k: int(v) for k, v in re.findall(r"^COMPTE (\S+)=(\d+)", t, re.M)}


def champs_sonde(t):
    d = {}
    for k in ("RAM_MEDIANE_MO", "BARRE_D273_MO", "NODE", "CHROME", "ALIM_SOURCE"):
        m = re.search(rf"^{k}=(\S+)", t, re.M)
        d[k] = m[1] if m else None
    m = re.search(r"^RAM_BANDE_MO=(\d+)-(\d+)", t, re.M)
    d["BANDE"] = (int(m[1]), int(m[2])) if m else None
    return d


def sous_la_barre(champs):
    return float(champs["RAM_MEDIANE_MO"]) < float(champs["BARRE_D273_MO"]) or champs["BANDE"][0] < float(champs["BARRE_D273_MO"])


def tally_sortie(texte):
    """(✓ de contrôle, ✗, bras de calibration ✓, constats, non vérifiables) d'une sortie de lecture adverse."""
    return (
        len(re.findall(r"^✓ ", texte, flags=re.M)),
        len(re.findall(r"^✗ ", texte, flags=re.M)),
        len(re.findall(r"^   ✓ ", texte, flags=re.M)),
        len(re.findall(r"^· ", texte, flags=re.M)),
        len(re.findall(r"^\? ", texte, flags=re.M)),
    )


# ── Les `.env` : classe de l'hôte, jamais l'hôte non local, jamais une valeur ────────────────────────────────────────
LOCAUX = {"localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"}


def hote_de(jeton):
    """L'hôte (sans identifiants, sans port) d'un jeton « schéma://autorité/… », ou None si ce n'est pas une URL. Un `localhost@evil` a pour hôte `evil` : les identifiants sont retirés AVANT."""
    m = re.match(r"^[A-Za-z][A-Za-z0-9+.\-]*://([^/?#]*)", jeton)
    if not m:
        return None
    auth = m[1].rsplit("@", 1)[-1]
    if auth.startswith("["):
        h = auth[: auth.find("]") + 1]
    else:
        h = re.sub(r":\d*$", "", auth)
    return h.lower()


def classe_hote(h):
    return h if (h in LOCAUX or h.endswith(".localhost")) else "NON LOCAL"


def variables_url(octets):
    """[(nom, [classes d'hôte…])] des variables d'un fichier `.env` dont la valeur porte au moins une URL. Une valeur peut en porter plusieurs (liste séparée par des virgules). Ne renvoie QUE le nom et
    la classe : un hôte non local n'est jamais conservé."""
    out = []
    for l in octets.decode("utf-8", errors="replace").splitlines():
        l = l.strip()
        if not l or l.startswith("#"):
            continue
        l = re.sub(r"^export\s+", "", l)
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$", l)
        if not m:
            continue
        val = m[2].strip()
        if len(val) >= 2 and val[0] in "\"'" and val[-1] == val[0]:
            val = val[1:-1]
        else:
            val = re.sub(r"\s+#.*$", "", val)
        hotes = [hote_de(j) for j in re.split(r"[,\s;]+", val)]
        hotes = [h for h in hotes if h]
        if hotes:
            out.append((m[1], [classe_hote(h) for h in hotes]))
    return out


def empreinte(octets):
    return hashlib.sha256(octets).hexdigest()


# ══ CALIBRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — deux bras par extracteur, abandon si un seul manque")
cal = []


def bras(nom, ok):
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom}")


t_vrai = "| fichier | pour |\n|---|---|\n| `docs/a/b.md` | x |\n| `c.md`, `d/e.py` | y |\n| pas un chemin | z |\n"
bras("chemins_table, cas vrai : 3 chemins d'un tableau (dont une ligne à deux chemins)", chemins_table(t_vrai) == ["docs/a/b.md", "c.md", "d/e.py"])
bras("chemins_table, cas vrai : un retour chariot DANS un chemin est CONSERVÉ (c'est le défaut de l'extension 2)", chemins_table("| `docs/a/b.py\r` | x |") == ["docs/a/b.py\r"])
bras("chemins_table, cas faux : un texte sans tableau rend 0", chemins_table("rien ici `x/y` en ligne") == [])
bras("lignes_de_table, cas vrai : 2 lignes dont la 1ʳᵉ cellule est un chemin ; cas faux : un en-tête sans chemin rend 0", len(lignes_de_table(t_vrai)) == 2 and lignes_de_table("| fichier | pour |\n|---|---|\n") == [])
bras("bloc_entre, cas vrai : le texte entre deux repères ; cas faux : un début absent rend None", bloc_entre("aa DEBUT x y FIN bb", "DEBUT", "FIN") == "DEBUT x y " and bloc_entre("aa bb", "DEBUT", "FIN") is None)
bras("entiers, cas vrai : « 1 718 / 136 (88 s) » → [1718, 136, 88] et « 5 504 s » → [5504]", entiers("1 718 / 136 (88 s)") == [1718, 136, 88] and entiers("5 504 s") == [5504])
bras("entiers, cas faux : une décimale à virgule n'est PAS coupée en deux entiers ; un texte sans nombre rend []", entiers("RAM 4 897,5 Mo, 12") == [12] and entiers("aucun nombre") == [])
bras("bilans_vitest, cas vrai : un résumé avec échecs, en ANSI → ((36, 2, 38), (466, 2, 468))", bilans_vitest("\x1b[2m Test Files \x1b[22m 2 failed | 36 passed (38)\n      Tests  2 failed | 466 passed (468)") == [((36, 2, 38), (466, 2, 468))])
bras("bilans_vitest, cas faux : un texte sans résumé rend [] ; deux résumés → deux couples dans l'ordre", bilans_vitest("rien") == [] and len(bilans_vitest(" Test Files  5 passed (5)\n Tests  48 passed (48)\n Test Files  65 passed (65)\n Tests  791 passed (791)")) == 2)
bras("compte_done, cas vrai : 2 lignes « …: Done » ; cas faux : « Done with it » en milieu de ligne rend 0", compte_done("a typecheck: Done\nb typecheck: Done\nc typecheck: Running") == 2 and compte_done("Done with it") == 0)
bras("erreurs_ts, cas vrai : « error TS2304 » compté 1 ; cas faux : « 0 errors » rend 0", erreurs_ts("src/a.ts(1,1): error TS2304: Cannot find name") == 1 and erreurs_ts("Found 0 errors.") == 0)
bras("duree_code, cas vrai : « fin … · 359 s · code 1 » → (359, 1) ; cas faux : un texte sans durée rend None", duree_code("début x\nfin 12/10/2026 17:04:22 · 359 s · code 1\n") == (359, 1) and duree_code("rien") is None)
bras("resume_tout, cas vrai : la ligne MESURÉ du tri → (386, 0, 21, 34, 5504) ; cas faux : une ligne tronquée rend None", resume_tout("MESURÉ : 386 garde(s) mordue(s) · 0 muette(s)/erreur(s) · 21 non mesurée(s) · 34 campagne(s) · 5504s") == (386, 0, 21, 34, 5504) and resume_tout("MESURÉ : 386 garde(s) mordue(s)") is None)
bras("gardes_mordues, cas vrai : « 102 garde(s) mordue(s) sur 102 cible(s) jouée(s) » → (102, 102) ; cas faux : « 8 garde(s) muette(s) » rend None", gardes_mordues("\n102 garde(s) mordue(s) sur 102 cible(s) jouée(s) · 0 muette(s)") == (102, 102) and gardes_mordues("8 garde(s) muette(s) sur 8") is None)
bras("comptes_inventaire, cas vrai : deux noms comptés ; cas faux : un texte sans « COMPTE » rend {}", comptes_inventaire("COMPTE chrome=0\nCOMPTE msedge=5\n  msedge PID 1") == {"chrome": 0, "msedge": 5} and comptes_inventaire("rien") == {})
c_ok = champs_sonde("RAM_MEDIANE_MO=4897.5\nRAM_BANDE_MO=4880-4933\nBARRE_D273_MO=4579\nNODE=0\nCHROME=0\nALIM_SOURCE=SECTEUR\n")
c_bas = champs_sonde("RAM_MEDIANE_MO=4368.5\nRAM_BANDE_MO=4357-4376\nBARRE_D273_MO=4579\nNODE=0\nCHROME=0\nALIM_SOURCE=SECTEUR\n")
c_mix = champs_sonde("RAM_MEDIANE_MO=4600\nRAM_BANDE_MO=4500-4700\nBARRE_D273_MO=4579\nNODE=0\nCHROME=0\nALIM_SOURCE=SECTEUR\n")
bras("sous_la_barre, cas vrai : médiane et bande au-dessus → False ; cas faux (un creux) : médiane sous la barre → True ; bande basse sous la barre malgré une médiane au-dessus → True", sous_la_barre(c_ok) is False and sous_la_barre(c_bas) is True and sous_la_barre(c_mix) is True)
bras("tally_sortie, cas vrai : 2 ✓ de contrôle, 1 ✗, 1 bras, 1 constat, 1 non vérifiable ; cas faux : un texte vide rend cinq zéros", tally_sortie("   ✓ bras\n✓ A1 x\n✓ A2 y\n✗ A3 z\n· C1 c\n? N1 n\n") == (2, 1, 1, 1, 1) and tally_sortie("") == (0, 0, 0, 0, 0))
bras("aplati, cas vrai : les retours à la ligne et les espaces multiples deviennent UNE espace", aplati("a\n  b\t\tc") == "a b c")
# Les `.env` : le sentinelle de secret ne doit JAMAIS apparaître dans ce que l'extracteur rend.
S_SECRET, S_TUNNEL = "SENTINELLE_SECRET_ZW330", "zw330-tunnel.exemple-invalide"
t_local = f'CLIENT_URL=http://localhost:3000\nCORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3100"\nexport DATABASE_URL=postgresql://u:{S_SECRET}@localhost:5432/db\n# COMMENT=https://{S_TUNNEL}\nSANS_URL=abc\n'
t_dist = (f"CLIENT_URL=https://{S_TUNNEL}\nCORS_ORIGINS=http://localhost:3000,https://{S_TUNNEL}\nA=http://localhost@{S_TUNNEL}/x\nB=http://localhost.{S_TUNNEL}\n"
          f"C=https://{S_TUNNEL}/?h=localhost\nD=http://[::1]:8080\nE=http://0.0.0.0:1\r\n")
r_local, r_dist = variables_url(t_local.encode()), variables_url(t_dist.encode())
bras("variables_url, cas vrai (tout local) : 3 variables d'URL (le commentaire et la variable sans URL ignorés), toutes classées locales ; l'identifiant secret n'est PAS dans le résultat",
     [n for n, _ in r_local] == ["CLIENT_URL", "CORS_ORIGINS", "DATABASE_URL"] and all(h != "NON LOCAL" for _, hs in r_local for h in hs) and S_SECRET not in repr(r_local) and S_TUNNEL not in repr(r_local))
bras("variables_url, cas faux (distant) : CLIENT_URL, l'un des deux hôtes de CORS_ORIGINS, `localhost@distant`, `localhost.distant` et `?h=localhost` sont NON LOCAL ; [::1] et 0.0.0.0 restent locaux ; l'hôte distant n'est PAS dans le résultat",
     dict(r_dist)["CLIENT_URL"] == ["NON LOCAL"] and dict(r_dist)["CORS_ORIGINS"] == ["localhost", "NON LOCAL"] and dict(r_dist)["A"] == ["NON LOCAL"] and dict(r_dist)["B"] == ["NON LOCAL"]
     and dict(r_dist)["C"] == ["NON LOCAL"] and dict(r_dist)["D"] == ["[::1]"] and dict(r_dist)["E"] == ["0.0.0.0"] and S_TUNNEL not in repr(r_dist))
bras("empreinte, cas vrai : mêmes octets → même empreinte ; cas faux : UN octet de plus (LF/CRLF compris) → empreinte différente", empreinte(b"A=1\n") == empreinte(b"A=1\n") and empreinte(b"A=1\n") != empreinte(b"A=1\r\n") and empreinte(b"A=1\n") != empreinte(b"A=2\n"))
bras("existe, cas vrai : la table d'ouverture de D329 existe à son commit ; cas faux : un chemin forgé n'existe pas", existe(OUV329, f"{PD}/table-ouverture.md") and not existe(OUV329, f"{PD}/ZZZ-forge.md"))
if not all(cal):
    sys.exit(f"ABANDON : calibration manquée ({cal.count(False)} bras sur {len(cal)})")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

# ══ FAMILLE X — l'état LIVE du dépôt ═════════════════════════════════════════════════════════════════════════════════
print("== X — état LIVE (git status, stash, fetch, rev-parse)")
git("fetch", "--quiet", check=False)
head = git("rev-parse", "HEAD").decode().strip()
orig = git("rev-parse", "origin/main").decode().strip()
fin_complet = git("rev-parse", FIN).decode().strip()
statut = [l for l in git("status", "--short", "--untracked-files=all").decode().split("\n") if l.strip()]
stash = [l for l in git("stash", "list").decode().split("\n") if l.strip()]
branche = git("rev-parse", "--abbrev-ref", "HEAD").decode().strip()


def ancetre(a, b):
    return subprocess.run(["git", "merge-base", "--is-ancestor", a, b], capture_output=True).returncode == 0


ctl("X1", "`origin/main` (après `git fetch`) contient la clôture de D329 et est un ancêtre-ou-égal de `HEAD`", (True, True), (ancetre(fin_complet, orig), ancetre(orig, head)))
ctl("X2", "`HEAD` est la table d'ouverture de ce lot (`12de7c2`), seule", OUV330, head[:7])
ctl("X3", "le parent de `HEAD` est la clôture de D329 (`8f53011`)", FIN, git("rev-parse", "HEAD^").decode().strip()[:7])
ctl("X4", "le commit `HEAD` ne contient QUE `docs/preuves/D330/table-ouverture.md`", ["docs/preuves/D330/table-ouverture.md"], [l for l in git("show", "--name-only", "--format=", "HEAD").decode().split("\n") if l.strip()])
ctl("X5", "aucun fichier SUIVI modifié ou ajouté à l'index", [], [l for l in statut if not l.startswith("??")])
ctl("X6", "tout fichier non suivi est sous `docs/preuves/D330/` (aucun fichier hors du lot)", [], [l for l in statut if l.startswith("??") and "docs/preuves/D330/" not in l])
ctl("X7", "aucun stash", [], stash)
ctl("X8", "branche `main`", "main", branche)
print(f"   (parcouru : {len(statut)} ligne(s) de statut dont {sum(1 for l in statut if l.startswith('??'))} non suivie(s) ; stash {len(stash)})")

# ══ FAMILLE E — l'état VIVANT des fichiers `.env` (classe d'hôte, empreinte, AUCUNE valeur) ════════════════════════════
print("\n== E — fichiers `.env` que lit une porte (empreinte, taille, date, classe d'hôte des variables d'URL ; aucune valeur, aucun hôte non local)")


def fichiers_env():
    """Les fichiers `.env` / `.env.*` (hors `.example`) à la racine et dans chaque dossier de premier niveau de apps/, packages/ et e2e/."""
    racines = ["."] + [f"apps/{d}" for d in sorted(os.listdir("apps"))] + [f"packages/{d}" for d in sorted(os.listdir("packages"))] + ["e2e"]
    out = []
    for r in racines:
        if not os.path.isdir(r):
            continue
        for n in sorted(os.listdir(r)):
            if (n == ".env" or n.startswith(".env.")) and not n.endswith(".example") and os.path.isfile(os.path.join(r, n)):
                out.append(os.path.normpath(os.path.join(r, n)).replace("\\", "/"))
    return out


envs = fichiers_env()
print(f"   fichiers `.env` trouvés : {len(envs)} → {envs}")
ctl("E1", "les fichiers `.env` d'une porte sont ceux des applications de `apps/` (un `.env` chacune ; aucun à la racine, aucun `.env.local` ou `.env.test`)", [f"apps/{d}/.env" for d in sorted(os.listdir("apps"))], envs)
for f in envs:
    b = open(f, "rb").read()
    ign = subprocess.run(["git", "check-ignore", "-q", f], capture_output=True).returncode == 0
    suivi = subprocess.run(["git", "ls-files", "--error-unmatch", f], capture_output=True).returncode == 0
    vu = variables_url(b)
    mtime = __import__("datetime").datetime.fromtimestamp(os.path.getmtime(f)).strftime("%Y-%m-%d %H:%M:%S")
    print(f"   {f} : {len(b)} octets · modifié {mtime} · SHA-256 {empreinte(b)} · {sum(1 for l in b.decode('utf-8','replace').splitlines() if re.match(r'^\s*[A-Za-z_]\w*\s*=', l))} variable(s) dont {len(vu)} d'URL : "
          + " ; ".join(f"{n}={'+'.join(h)}" for n, h in vu))
    ctl(f"E2{envs.index(f)}", f"`{f}` est ignoré par git et non suivi", (True, False), (ign, suivi))
    ctl(f"E3{envs.index(f)}", f"`{f}` : aucune variable d'URL n'a un hôte non local (état VIVANT : Ko l'a remis à sa valeur locale)", [], [n for n, hs in vu if "NON LOCAL" in hs])


# ══ FAMILLE P — provenance et ordre des commits de D329 ══════════════════════════════════════════════════════════════
print("\n== P — provenance et ordre des commits de D329 (objets git)")
chaine = git("rev-list", "--reverse", f"{DEPART}..{FIN}").decode().split()
sujets = {c: git("log", "-1", "--format=%s", c).decode().strip() for c in chaine}
ctl("P1", "tout commit entre la clôture de D328 et celle de D329 porte « docs(rang-36): D329 » dans son sujet", len(chaine), sum(1 for s in sujets.values() if s.startswith("docs(rang-36): D329")))
print(f"   (parcouru : {len(chaine)} commit(s) : " + " ".join(c[:7] for c in chaine) + ")")


def noms_du_commit(sha):
    return [l for l in git("show", "--name-only", "--format=", sha).decode().split("\n") if l.strip()]


ctl("P2", "le premier commit de D329 est la table d'ouverture, et il ne contient QUE `table-ouverture.md`", ([OUV329], [f"{PD}/table-ouverture.md"]), (([chaine[0][:7]]), noms_du_commit(chaine[0])))
ctl("P3", "le parent du premier commit de D329 est la clôture de D328", DEPART, git("rev-parse", f"{chaine[0]}^").decode().strip()[:7])
diff_fichiers = [l for l in git("diff", "--name-only", DEPART, FIN).decode().split("\n") if l.strip()]
hors_doc = [f for f in diff_fichiers if not (f in AUTORITES or f.startswith("docs/preuves/"))]
ctl("P4", "le diff de D329 ne contient AUCUN fichier de code, de test, de harnais, de migration ni `docker-compose.yml` (les trois `.md` et `docs/preuves/` seulement)", [], hors_doc)
print(f"   (parcouru : {len(diff_fichiers)} fichier(s) du diff DEPART..FIN dont {sum(1 for f in diff_fichiers if f in AUTORITES)} `.md` d'autorité et {sum(1 for f in diff_fichiers if f.startswith('docs/preuves/D329/'))} sous `docs/preuves/D329/`)")

table_fin_brut = git("show", f"{FIN}:{PD}/table-ouverture.md").decode("utf-8", errors="replace")
decl_fin = chemins_table(table_fin_brut)
decl_set = set(decl_fin)
non_declares = sorted(f for f in diff_fichiers if f not in decl_set)
absents = sorted(c for c in decl_set if not existe(FIN, c))
ctl("P5", "le diff est inclus dans la table, en chemins COMPLETS (0 fichier du diff non déclaré)", [], non_declares)
ctl("P6", "aucun fichier déclaré n'est absent de l'arbre à la clôture (les quatre conditionnels existent)", [], absents)
ctl("P7", "aucun chemin déclaré ne finit par « / » (aucun préfixe) et aucun ne porte de caractère de contrôle", [], sorted(c for c in decl_set if c.endswith("/") or re.search(r"[\x00-\x1f]", c)))
print(f"   (parcouru : {len(decl_fin)} chemin(s) déclaré(s) à la clôture ; {len(diff_fichiers)} fichier(s) du diff ; les trois `.md` y sont déclarés : {all(a in decl_set for a in AUTORITES)})")

# ordre : l'index du commit qui AJOUTE chaque fichier, et celui du commit où la table le déclare pour la première fois
ajout: dict = {}
modif: dict = {}
courant = None
for l in git("log", "--reverse", "--name-status", "--format=@@%H", f"{DEPART}..{FIN}").decode("utf-8", errors="replace").split("\n"):
    if l.startswith("@@"):
        courant = chaine.index(l[2:])
    elif l.strip() and courant is not None:
        st, _, chemin = l.partition("\t")
        if st.startswith("A"):
            ajout.setdefault(chemin, courant)
        modif.setdefault(chemin, []).append(courant)
versions_table = [c for c in chaine if f"{PD}/table-ouverture.md" in noms_du_commit(c)]
decl_idx: dict = {}      # chemin NORMALISÉ (strip) → premier commit dont la table le déclare, à un retour chariot près
decl_exact: dict = {}    # chemin EXACT → premier commit dont la table le déclare, à l'octet
for c in versions_table:
    for p in chemins_table(git("show", f"{c}:{PD}/table-ouverture.md").decode("utf-8", errors="replace")):
        decl_exact.setdefault(p, chaine.index(c))
        decl_idx.setdefault(p.strip(), chaine.index(c))
tardifs_norm = sorted(f for f in diff_fichiers if f != f"{PD}/table-ouverture.md" and f in ajout and not decl_idx.get(f, 10**9) < ajout[f])
tardifs_exact = sorted(f for f in diff_fichiers if f != f"{PD}/table-ouverture.md" and f in ajout and not decl_exact.get(f, 10**9) < ajout[f])
ctl("P8", "à un retour chariot près, chaque fichier est déclaré dans la table par un commit STRICTEMENT antérieur à celui qui l'ajoute (hors la table elle-même)", [], tardifs_norm)
print(f"   (parcouru : {len(versions_table)} version(s) de la table : " + " ".join(c[:7] for c in versions_table) + f" ; {len(ajout)} fichier(s) ajouté(s))")
idx_lect = ajout.get(f"{PD}/lecture-adverse/confronter-sortie.txt")
idx_d277 = ajout.get(f"{PD}/passe-d277/balayage-1-AVANT-ECRITURE.txt")
idx_md = min(modif[a][0] for a in AUTORITES if a in modif)
ctl("P9", "la sortie de la lecture adverse ET la première passe D277 entrent dans des commits antérieurs à tout `.md` d'autorité", (True, True), (idx_lect is not None and idx_lect < idx_md, idx_d277 is not None and idx_d277 < idx_md))
arb = chaine[idx_md]
ctl("P10", "le premier commit qui touche un `.md` d'autorité ne touche QUE `ZWADJ_CONTINUITE.md` (les arbitrages de Ko, seuls dans leur commit)", [CONT], noms_du_commit(arb))
ajoutees = [l[1:] for l in git("show", "--format=", "-U0", arb).decode("utf-8", errors="replace").split("\n") if l.startswith("+") and not l.startswith("+++")]
txt_ajoute = "\n".join(ajoutees)
ctl("P11", "ce commit apporte les premiers mots de Ko (« Rang 36 : j'arbitre la certification. » et « Je renvoie après l'attente »)", (True, True), ("Rang 36 : j'arbitre la certification." in txt_ajoute, "Je renvoie après l'attente" in txt_ajoute))
bloc_arb = bloc_entre(show(arb, CONT), "« Je renvoie après l'attente", "serait écrasé. »")
bloc_fin = bloc_entre(show(FIN, CONT), "« Je renvoie après l'attente", "serait écrasé. »")
ctl("P12", "le texte de Ko du 12/10 est IDENTIQUE à la clôture et dans le commit qui l'a posé (non retouché depuis)", True, bloc_arb is not None and bloc_arb == bloc_fin)
print(f"   (parcouru : {len(ajoutees)} ligne(s) ajoutée(s) par ce commit ; bloc de Ko {len(bloc_arb or '')} / {len(bloc_fin or '')} caractère(s))")

# protocole avant toute mesure : l'horodatage du commit, le journal de la passe, le reflog local de la poussée
proto_c = git("log", "-1", "--format=%cI", PROTO).decode().strip()
prog = show(FIN, f"{PASSE}/progression.txt")
m0 = re.match(r"(\d\d)/(\d\d)/(\d{4}) (\d\d:\d\d:\d\d) PASSE", prog)
debut_passe = f"{m0[3]}-{m0[2]}-{m0[1]}T{m0[4]}"
proto_local = proto_c[:19]
ctl("P13", "le protocole (`4202dd4`) est commité AVANT le premier horodatage du journal de la passe (même fuseau local)", True, proto_local < debut_passe)
print(f"   (commit {proto_c} · début de la passe {debut_passe})")
reflog = git("reflog", "show", "origin/main", "--date=iso", check=False).decode("utf-8", errors="replace")
mr = re.search(rf"^{PROTO}\S* refs/remotes/origin/main@\{{(\d{{4}}-\d\d-\d\d) (\d\d:\d\d:\d\d) [+-]\d{{4}}\}}: update by push", reflog, re.M)
ctl("P14", "le reflog LOCAL de `origin/main` date la poussée de `4202dd4` AVANT le début de la passe", True, bool(mr) and f"{mr[1]}T{mr[2]}" < debut_passe)
print(f"   (reflog : {mr[1] + ' ' + mr[2] if mr else 'absent'})")
non_verifiable("N1", "que la poussée de `4202dd4` ait eu lieu à l'heure du reflog : le reflog est LOCAL et modifiable ; seul le distant le dirait, et il ne date pas ses mises à jour de référence")

# ══ FAMILLE C — le correctif du retour chariot de l'extension 2 ════════════════════════════════════════════════════════
print("\n== C — le correctif `1235ef4` (un retour chariot dans chacun des chemins de l'extension 2)")
FIX = "1235ef4"
fix_complet = git("rev-parse", FIX).decode().strip()
ctl("C1", "`1235ef4` est dans la chaîne de D329, après le commit des pièces de la passe", True, fix_complet in chaine and chaine.index(fix_complet) > ajout[f"{PASSE}/progression.txt"])
ctl("C2", "`1235ef4` ne contient QUE `table-ouverture.md`", [f"{PD}/table-ouverture.md"], noms_du_commit(FIX))
avant = git("show", f"{FIX}^:{PD}/table-ouverture.md").decode("utf-8", errors="replace")
apres = git("show", f"{FIX}:{PD}/table-ouverture.md").decode("utf-8", errors="replace")
sec_apres = apres[apres.find("#### Extension 2"):]
sec_avant = avant[avant.find("#### Extension 2"):]
rows_ext2 = chemins_table(sec_apres)
ctl("C3", "AVANT le correctif, chaque chemin de l'extension 2 porte un retour chariot (compte = lignes de l'extension 2 après)", len(rows_ext2), sum(1 for p in chemins_table(sec_avant) if "\r" in p))
ctl("C4", "APRÈS le correctif, aucun chemin de la table ne porte de caractère de contrôle", [], [p for p in chemins_table(apres) if re.search(r"[\x00-\x1f]", p)])
ctl("C5", "le correctif ne retire QUE les retours chariot : les mêmes chemins, à un `\\r` près, avant et après (les deux listes triées, comparées terme à terme)", True, sorted(p.replace("\r", "") for p in chemins_table(avant)) == sorted(chemins_table(apres)))
ns = git("diff", "--numstat", f"{FIX}^", FIX).decode().split()
ctl("C6", "le diff du correctif = autant de lignes retirées qu'ajoutées = les lignes de l'extension 2 (hors le paragraphe d'introduction)", (len(rows_ext2), len(rows_ext2)), (int(ns[0]), int(ns[1])))
print(f"   (parcouru : {len(chemins_table(avant))} chemin(s) avant · {len(chemins_table(apres))} après · {len(rows_ext2)} ligne(s) d'extension 2)")
ext2_fichiers = [p for p in rows_ext2]
a_ext2 = [ajout.get(p) for p in ext2_fichiers]
ctl("C7", "chacun des chemins de l'extension 2 EXISTE à la clôture et a été ajouté au dépôt par un commit de la chaîne", [], [p for p in ext2_fichiers if p not in ajout])
exact_apres_ajout = sorted(p for p in ext2_fichiers if decl_exact.get(p, 10**9) > ajout[p])
norm_avant_ajout = sorted(p for p in ext2_fichiers if decl_idx.get(p, 10**9) < ajout[p])
ctl("C8", "À L'OCTET, le chemin exact de chaque fichier de l'extension 2 est déclaré APRÈS son versement (le correctif suit le commit des pièces) : tous les chemins exacts sont tardifs", len(ext2_fichiers), len(exact_apres_ajout))
ctl("C9", "à un retour chariot près, l'extension 2 précède pourtant le versement de chacun de ses fichiers", len(ext2_fichiers), len(norm_avant_ajout))
constat("C-C1", f"la LETTRE de la règle de D328 (« toute extension : un commit propre qui l'ajoute, AVANT le commit du fichier qu'elle couvre », en chemins COMPLETS) n'est pas tenue à l'octet pour {len(exact_apres_ajout)} fichiers : "
                f"le chemin exact n'entre dans la table qu'à `{FIX}`, APRÈS le commit qui les verse ; l'ESPRIT l'est (l'extension 2 précède, à un `\\r` près, {len(norm_avant_ajout)} versements) et D329 l'écrit lui-même (faute n° 6). "
                f"Le correctif est un commit propre, sans autre fichier. Ce n'est pas un défaut de comportement ; c'est un écart à la lettre, déjà déclaré.")

# ══ FAMILLE T — la table d'ouverture recopiée dans un .md d'autorité (règle 3 de D328) ═══════════════════════════════════
print("\n== T — la table recopiée « à l'identique » dans un `.md` d'autorité (AGENTS.md, ordre des commits, point 3)")
table_ouv = show(OUV329, f"{PD}/table-ouverture.md")
rangees = lignes_de_table(bloc_entre(table_ouv, "## Fichiers attendus", "### Fichiers à déclarer PAR EXTENSION") or "")
textes_md = {a: show(FIN, a) for a in AUTORITES}
lignes_md = {a: set(textes_md[a].split("\n")) for a in AUTORITES}
retrouvees = [r for r in rangees if any(r in lignes_md[a] for a in AUTORITES)]
ctl("T1", "chaque ligne du tableau « Fichiers attendus » de la table d'ouverture de D329 se retrouve, mot pour mot, dans l'un des trois `.md` d'autorité à la clôture", len(rangees), len(retrouvees))
print(f"   (parcouru : {len(rangees)} ligne(s) de tableau de la table d'ouverture ; retrouvées {len(retrouvees)})")
table_328 = show("ab8e6f6", "docs/preuves/D328/table-ouverture.md") if existe("ab8e6f6", "docs/preuves/D328/table-ouverture.md") else ""
table_328 = table_328 or show(DEPART, "docs/preuves/D328/table-ouverture.md")
rang_328 = lignes_de_table(bloc_entre(table_328, "## Fichiers attendus", "###") or "")
rec_328 = [r for r in rang_328 if r in lignes_md[CONT]]
ctl("T2", "CONTRE-ÉPREUVE : la table d'ouverture de D328 était, elle, recopiée mot pour mot dans `ZWADJ_CONTINUITE.md` (tableau « Fichiers attendus » : toutes ses lignes s'y retrouvent)", len(rang_328), len(rec_328))
print(f"   (parcouru : {len(rang_328)} ligne(s) de tableau de la table de D328 ; retrouvées {len(rec_328)})")
if len(retrouvees) < len(rangees):
    constat("T-C1", f"la table d'ouverture de D329 n'est PAS recopiée dans un `.md` d'autorité : {len(retrouvees)} ligne(s) sur {len(rangees)} s'y retrouvent. La règle 3 de l'ordre des commits (`AGENTS.md`, D328) dit « la table y est recopiée à l'identique » ; "
                    f"D328 l'avait fait (point d'entrée du rang 35, tableau « Fichiers attendus — chemins COMPLETS »). Mesure : D329 la cite par son chemin et ses extensions, jamais par ses lignes. Ce lot-ci la recopie.")


# ══ FAMILLE R — chaque chiffre du tableau « prédit / mesuré » de D329 contre ses pièces (et contre les prédictions du protocole) ═══
print("\n== R — le tableau « prédit / mesuré » de D329 (« RÉSULTAT DE LA PASSE »), ligne par ligne, contre les pièces versées et contre le protocole")
print("   (RÈGLE de cette famille : tout ATTENDU est lu dans le TEXTE de D329 ou du protocole, puis confronté à la PIÈCE ; aucun attendu n'est tapé ici)")
arbre_fin = [f for f in git("ls-tree", "-r", "--name-only", FIN, "--", PASSE).decode().split("\n") if f.strip()]


def piece(nom):
    return show(FIN, f"{PASSE}/{nom}")


def nettoyer(c):
    return c.replace("*", "").replace("`", "")


cont_fin = norm(show(FIN, CONT))
txt_prop = nettoyer(cont_fin)           # le texte de D329 sans gras ni accents graves, pour les phrases du résultat
bloc_tab = bloc_entre(cont_fin, "| mesure | code RÉEL | chiffres", "\n\n") or ""
lignes_tab = [l for l in bloc_tab.split("\n") if l.startswith("|") and not l.startswith("|---") and not l.startswith("| mesure")]
LIG = {}
for l in lignes_tab:
    cellules = [nettoyer(c.strip()) for c in l.strip().strip("|").split(" | ")]
    LIG[cellules[0]] = cellules


def ligne_tab(prefixe):
    """La ligne dont l'étiquette est EXACTEMENT `prefixe`, sinon la seule dont l'étiquette le COMMENCE (« test » commence « test:int » et « test:e2e » : l'exact l'emporte)."""
    exact = [k for k in LIG if k == prefixe]
    if len(exact) == 1:
        return LIG[exact[0]]
    trouvees = [k for k in LIG if k.startswith(prefixe)]
    return LIG[trouvees[0]] if len(trouvees) == 1 else None


ctl("R0", "le tableau de D329 a 5 cellules par ligne", [5] * len(lignes_tab), [len(c) for c in LIG.values()])
print(f"   (parcouru : {len(lignes_tab)} ligne(s) de tableau : " + " | ".join(k[:22] for k in LIG) + ")")

# ── Les prédictions du protocole (point d'entrée du rang 36 À 4202dd4) : extraites du TEXTE du protocole
cont_proto = norm(show(PROTO, CONT))
pred_bloc = nettoyer(bloc_entre(cont_proto, "**PRÉDICTIONS, DÉRIVÉES et non critères**", "**Un compte qui s'écarte suspend la marque**") or "")
pred = {}
m = re.search(r"test (\d+)/(\d+) · (\d+)/(\d+) · (\d+)/(\d+) · (\d+)/(\d+) = ([\d ]+) / (\d+)", pred_bloc)
pred["test"] = (sorted((int(m[i]), int(m[i + 1])) for i in (1, 3, 5, 7)), (int(m[9].replace(" ", "")), int(m[10]))) if m else None
m = re.search(r"test:int (\d+)/(\d+)", pred_bloc)
pred["testint"] = (int(m[1]), int(m[2])) if m else None
m = re.search(r"test:e2e (\d+) passés · (\d+) ignoré \((\d+)\)", pred_bloc)
pred["e2e"] = tuple(int(x) for x in m.groups()) if m else None
m = re.search(r"(\d+) campagnes · (\d+) mordues · (\d+) muette · (\d+) non mesurées", pred_bloc)
pred["tout"] = tuple(int(x) for x in m.groups()) if m else None
seg = re.search(r"--int ×8 : (.*?) = (\d+) ;", pred_bloc)
pred["int_valeurs"] = [int(k) for _, k in re.findall(r"([a-z0-9\-]+) (\d+)(?= \(|,| =)", seg[1] + " =")] if seg else None
pred["int_somme"] = int(seg[2]) if seg else None
m = re.search(r"--e2e ×1 \(r26 seul\) : (\d+)", pred_bloc)
pred["r26"] = int(m[1]) if m else None
m = re.search(r"CERTIFIANT : (\d+) mordues · (\d+) muette · (\d+) non mesurée, (\d+) campagnes sur (\d+)", pred_bloc)
pred["certifiant"] = tuple(int(x) for x in m.groups()) if m else None
m = re.search(r"lue au chemin (\d+)(?: \([^)]*\))? · lue hors du chemin (\d+)(?: \([^)]*\))? · code de sortie seul, non prouvée \(R1\) (\d+) · code de sortie seul, non classée (\d+)", pred_bloc)
pred["etiq"] = tuple(int(x) for x in m.groups()) if m else None
m = re.search(r"(\d+) / (\d+) / (\d+) « Done »", pred_bloc)
pred["done"] = [int(x) for x in m.groups()] if m else None
cles = ("test", "testint", "e2e", "tout", "int_valeurs", "r26", "certifiant", "etiq", "done")
ctl("R1", "les prédictions du protocole (`4202dd4`) sont extraites du texte du protocole : neuf clés (portes, test:int, e2e, --tout, --int, r26, certifiant, étiquettes, « Done »)", [True] * 9, [bool(pred.get(k)) for k in cles])
print(f"   (prédictions lues : {pred})")
ctl("R1b", "le protocole prédit HUIT valeurs `--int` (une par harnais verrouillé) dont la somme est celle qu'il écrit (153)", (8, pred["int_somme"]), (len(pred["int_valeurs"] or []), sum(pred["int_valeurs"] or [])))

# ── typecheck / lint / build
for ident, nom in (("R2", "typecheck"), ("R3", "lint"), ("R4", "build")):
    cel = ligne_tab(nom)
    log, code, hrs = piece(f"{nom}.log"), piece(f"{nom}.code").strip(), duree_code(piece(f"{nom}.heures"))
    txt = entiers(cel[2])
    mesure = [compte_done(log)] + ([erreurs_ts(log)] if nom == "typecheck" else []) + [hrs[0]]
    ctl(ident, f"`{nom}` : le texte {txt} = « Done » / error TS / durée recomptés dans `{nom}.log` et `{nom}.heures` ; le code du texte = `{nom}.code`", (txt, cel[1]), (mesure, code))
ctl("R5", "les « Done » du texte (8, 8, 4) sont ceux que le protocole prédit (« 8 / 8 / 4 « Done » »)", pred["done"], [entiers(ligne_tab(n)[2])[0] for n in ("typecheck", "lint", "build")])

# ── test
cel = ligne_tab("test")
txt = entiers(cel[2])
bil = bilans_vitest(piece("test.log"))
paires_piece = sorted((b[1][0], b[0][0]) for b in bil)            # (tests passés, fichiers passés)
paires_txt = sorted((txt[i], txt[i + 1]) for i in range(0, 8, 2))
tot_piece = (sum(b[1][0] for b in bil), sum(b[0][0] for b in bil))
ctl("R6", "`test` : les quatre couples tests/fichiers du texte = ceux des quatre résumés vitest de `test.log` ; leur somme (« 1 718 / 136 ») et la durée = `test.log` et `test.heures`", (paires_txt, (txt[8], txt[9]), txt[10]), (paires_piece, tot_piece, duree_code(piece("test.heures"))[0]))
ctl("R7", "`test` : aucun test en échec dans les quatre résumés ; le mesuré (couples, somme) est ce que le protocole prédit, et le tableau le marque « ✓ exact »", (0, pred["test"], True), (sum(b[1][1] + b[0][1] for b in bil), (paires_piece, tot_piece), cel[3].replace("✓ ", "").strip() == "exact"))
ctl("R8", "`test` : le code RÉEL du tableau = `test.code`", cel[1], piece("test.code").strip())

# ── test:int
cel = ligne_tab("test:int")
bil = bilans_vitest(piece("testint-EXTRAIT.txt"))
mes_i = [bil[0][1][0], bil[0][1][1], bil[0][1][2], bil[0][0][0], bil[0][0][1], bil[0][0][2], duree_code(piece("testint.heures"))[0]]
ctl("R9", "`test:int` : les sept entiers du texte (466 passés, 2 échecs, 468 ; 36 fichiers passés, 2 en échec, 38 ; 359 s) = le résumé de `testint-EXTRAIT.txt` et `testint.heures` ; le code du tableau = `testint.code`", (entiers(cel[2]), cel[1]), (mes_i, piece("testint.code").strip()))
ctl("R11", "`test:int` : la prédiction du protocole (468 tests, 38 fichiers) ≠ le mesuré (466 passés + 2 échecs) ; le tableau le marque « ✗ » — la marque et l'inégalité s'accordent", (True, True), ((pred["testint"][0], pred["testint"][1]) != (mes_i[0], mes_i[3] + mes_i[4]), cel[3].startswith("✗")))
ctl("R11b", "`test:int` : la SOMME passés + échecs (468 tests, 38 fichiers) est la prédiction : le total prévu était exact, c'est le partage passés/échecs qui ne l'était pas", pred["testint"], (mes_i[0] + mes_i[1], mes_i[3] + mes_i[4]))

# ── e2e
cel = ligne_tab("test:e2e")
ex = piece("e2e-EXTRAIT.txt")
mr = re.search(r"Running : \[(\d+)\] · résumé : \{(.*?)\}", ex)
res = {k: int(v) for k, v in re.findall(r"'(\w+)': (\d+)", mr[2])} if mr else {}
mt = re.match(r"(\d+) passés · (\d+) ignoré sur (\d+) \((\d+) s\)", cel[2])
mes_e = [res.get("passed"), res.get("skipped"), int(mr[1]) if mr else None, duree_code(piece("e2e.heures"))[0]]
ctl("R12", "`test:e2e` : le texte (48 passés · 1 ignoré sur 49, 190 s) = le résumé de `e2e-EXTRAIT.txt` et `e2e.heures` ; le code du tableau = `e2e.code`", ([int(x) for x in mt.groups()] if mt else None, cel[1]), (mes_e, piece("e2e.code").strip()))
ctl("R13", "`test:e2e` : la prédiction du protocole (passés · ignoré · total) = le mesuré", pred["e2e"], tuple(mes_e[:3]))
mp = re.search(r"lignes parcourues : (\d+) \(attendu (\d+).*?gardées : (\d+)", ex)
mt2 = re.search(r"\((\d[\d ]*) lignes parcourues, attendu (\d[\d ]*) ; (\d+) gardées", cel[4])
ctl("R14", "`test:e2e` : « 1 478 lignes parcourues, attendu 1 478 ; 52 gardées » (colonne pièces du tableau) = l'en-tête de l'extrait", [int(mt2[1].replace(" ", "")), int(mt2[2].replace(" ", "")), int(mt2[3])] if mt2 else None, [int(mp[1]), int(mp[2]), int(mp[3])] if mp else None)
m49 = re.search(r"(\d+) jetons dans la source, (\d+) dans l'extrait", cel[4])
non_verifiable("N2", f"« {m49[1] if m49 else '?'} jetons dans la source, {m49[2] if m49 else '?'} dans l'extrait » (e2e) : la source est le journal brut de l'e2e, HORS dépôt (il porte des jetons) ; l'extrait versé ne porte pas ce décompte (le mot « jeton » y figure : {'oui' if 'jeton' in ex.lower() else 'non'})")

# ── --tout
cel = ligne_tab("--tout")
mt = re.match(r"(\d+) campagnes · (\d+) mordues · (\d+) muette · (\d+) non mesurées, ([\d ]+) s ; (\d+) journaux de CETTE passe copiés, (\d+) antérieur", cel[2])
rt = resume_tout(piece("campagnes-tout.log"))
n_camp = sum(1 for f in arbre_fin if f.startswith(f"{PASSE}/campagnes/"))
n_r23 = sum(1 for f in arbre_fin if f.startswith(f"{PASSE}/rang23/"))
n_aoa = sum(1 for f in arbre_fin if f.startswith(f"{PASSE}/available-on-api/"))
n_ant = sum(1 for f in arbre_fin if "ANTERIEUR-A-LA-PASSE" in f)
txt_tout = [int(mt[1]), int(mt[2]), int(mt[3]), int(mt[4]), int(mt[5].replace(" ", "")), int(mt[6]), int(mt[7])] if mt else None
ctl("R15", "`--tout` : (campagnes, mordues, muettes, non mesurées, secondes, journaux copiés, antérieurs) du texte = la ligne MESURÉ de `campagnes-tout.log`, `campagnes-tout.heures` et les fichiers de la passe", txt_tout, [rt[3], rt[0], rt[1], rt[2], duree_code(piece("campagnes-tout.heures"))[0], n_camp + n_r23 + n_aoa, n_ant])
ctl("R16", "`--tout` : le code RÉEL du tableau (« 1 (attendu) ») = `campagnes-tout.code`", entiers(cel[1])[0], int(piece("campagnes-tout.code").strip()))
ctl("R17", "`--tout` : la prédiction du protocole (campagnes · mordues · muette · non mesurées) = le mesuré", pred["tout"], (rt[3], rt[0], rt[1], rt[2]))
print(f"   (parcouru : campagnes/ {n_camp} · rang23/ {n_r23} · available-on-api/ {n_aoa} · « ANTERIEUR-A-LA-PASSE » {n_ant})")

# ── --int ×8
cel = ligne_tab("--int")
paires_txt = re.findall(r"(-?[\w]+(?:-[\w]+)*) (\d+) \(([\d ]+) s", cel[2])
noms_int = sorted(re.match(rf"{re.escape(PASSE)}/int-(.+)\.log$", f)[1] for f in arbre_fin if re.match(rf"{re.escape(PASSE)}/int-(.+)\.log$", f))
mesure_int = {}
for n in noms_int:
    g = gardes_mordues(piece(f"int-{n}.log"))
    h = duree_code(piece(f"int-{n}.heures"))
    mesure_int[n] = (g[0], g[1], h[0], h[1], piece(f"int-{n}.code").strip())
dev, prec = [], ""
for n, k, s in paires_txt:
    if n.startswith("-"):
        n = prec + n
    else:
        prec = n.split("-")[0] if n.startswith("solid") else prec
    dev.append((n, int(k), int(s.replace(" ", ""))))
ctl("R18", "`--int` ×8 : les huit couples (harnais, gardes mordues, secondes) du texte = ceux des `int-<harnais>.log` / `.heures` (les noms « -s2 », « -s3 », « -s6 » complétés par « solid »)", sorted(dev), sorted((n, v[0], v[2]) for n, v in mesure_int.items()))
n_code = int(re.search(r"×(\d+)", cel[1])[1])
ctl("R19", "`--int` ×8 : mordues = cibles jouées pour chaque harnais ; le code du tableau (« 0 ×8 ») = les huit `int-<harnais>.code`", (True, ["0"] * n_code), (all(v[0] == v[1] for v in mesure_int.values()), [v[4] for v in mesure_int.values()]))
mtot = re.search(r"= (\d+)$", cel[2].strip())
ctl("R20", "`--int` ×8 : la somme du texte (153) = la somme des mesurées ; les valeurs prédites par le protocole, une à une, sont les mesurées", (int(mtot[1]), pred["int_valeurs"]), (sum(v[0] for v in mesure_int.values()), [mesure_int[n][0] for n in noms_int]))
print(f"   (parcouru : {len(noms_int)} harnais --int : {noms_int})")

# ── r26, contre-épreuve
cel = ligne_tab("--e2e")
g = gardes_mordues(piece("e2e-r26.log"))
mt = re.match(r"(\d+) \((\d+) s\)", cel[2])
ctl("R21", "`--e2e` ×1 (r26) : « 4 (446 s) » = `e2e-r26.log` (mordues = cibles) et `e2e-r26.heures` ; le code du tableau = `e2e-r26.code` ; la prédiction du protocole = le mesuré", ([int(mt[1]), int(mt[2]), cel[1], pred["r26"]]) if mt else None, [g[0], duree_code(piece("e2e-r26.heures"))[0], piece("e2e-r26.code").strip(), g[0]])
ctl("R21b", "`--e2e` ×1 (r26) : les 4 gardes mordues sont les 4 cibles jouées", g[0], g[1])
cel = ligne_tab("contre-épreuve")
g = gardes_mordues(piece("contre-epreuve.log"))
mt = re.match(r"(\d+) mordues sur (\d+) \((\d+) s\)", cel[2])
ctl("R22", "contre-épreuve : « 5 mordues sur 5 (3 s) » = `contre-epreuve.log` et `.heures` ; le code du tableau = `contre-epreuve.code`", ([int(x) for x in mt.groups()] + [cel[1]]) if mt else None, [g[0], g[1], duree_code(piece("contre-epreuve.heures"))[0], piece("contre-epreuve.code").strip()])

# ── lectures
cel = ligne_tab("lecture de rang23")
r23 = piece("lecture-rang23.txt")
m = re.search(r"MESURES LUES : (\d+) · MORSURES LUES : (\d+) · DÉMARRÉES \(exécutés > 0\) : (\d+)", r23)
t23 = entiers(cel[2])
ctl("R23", "lecture de `rang23` : « 13 mesures : MORSURES LUES 13 · DÉMARRÉES 13 » = la dernière ligne de `lecture-rang23.txt`", t23, [int(x) for x in m.groups()] if m else None)
cel = ligne_tab("lecture d'available-on-api")
aoa = piece("lecture-available-on-api.txt")
m = re.search(r"journaux lus : (\d+).*?pré-vol (\d+).*?écarts (\d+)", aoa)
ctl("R24", "lecture d'`available-on-api` : « 30 journaux · 12 pré-vols · 0 écart » = `lecture-available-on-api.txt` ; autant de fichiers que de journaux lus dans `available-on-api/`", (entiers(cel[2]), entiers(cel[2])[0]), ([int(x) for x in m.groups()] if m else None, n_aoa))
lc = piece("lecture-campagnes.txt")
m = re.search(r"CERTIFIANT : (\d+) mordues · (\d+) muettes · (\d+) non mesurées · (\d+) campagnes qui COMPTENT sur (\d+) \(attendu (\d+)\) · déclarées (\d+)", lc)
rangees_lc = [l for l in lc.split("\n") if re.match(r"^\S+\s+(--tout|--int|--e2e)\s+\d+\s+\d+", l)]
au_dessus = sum(1 for l in rangees_lc if "≥ plancher" in l)
lues = sum(1 for l in rangees_lc if re.search(r"\sLUE\s", l))
oui = sum(1 for l in rangees_lc if re.search(r"\sOUI\s", l))
der = show(FIN, f"{PD}/plancher/deriver-plancher-sortie.txt")
repris, mesures = len(re.findall(r"REPRIS de D324", der)), len(re.findall(r"MESURÉ à D329", der))
cal12 = len(re.findall(r"^  ✓", show(FIN, f"{PD}/outils/lire-campagnes-calibration.txt"), re.M))
cel = ligne_tab("lecture des campagnes")
mt = re.match(r"(\d+) mordues · (\d+) muettes · (\d+) non mesurées, (\d+) campagnes sur (\d+) qui COMPTENT ; point 12 : (\d+) au-dessus de leur plancher \((\d+) repris, (\d+) mesurés\), (\d+) LUES ; calibration (\d+) bras sur (\d+)", cel[2])
tg = [int(x) for x in mt.groups()] if mt else None
ctl("R25", "lecture des campagnes : « 416 mordues · 0 muettes · 0 non mesurées, 34 campagnes sur 34 qui COMPTENT » = la ligne CERTIFIANT de `lecture-campagnes.txt` (qui dit aussi : attendu 34, déclarées 416)", (tg[:5], tg[4], tg[0]) if tg else None, ([int(m[1]), int(m[2]), int(m[3]), int(m[4]), int(m[5])], int(m[6]), int(m[7])) if m else None)
ctl("R26", "lecture des campagnes : « point 12 : 30 au-dessus de leur plancher (26 repris, 4 mesurés), 4 LUES ; calibration 12 bras sur 12 » = lignes « ≥ plancher » / REPRIS / MESURÉ / LUE / bras ✓ recomptés dans les pièces", tg[5:9] + [tg[9]] if tg else None, [au_dessus, repris, mesures, lues, cal12])
ctl("R27", "lecture des campagnes : les lignes de campagne du tableau de lecture sont au nombre des « campagnes sur N » du texte, et toutes « OUI » (elles comptent)", (tg[4], tg[4]) if tg else None, (len(rangees_lc), oui))
print(f"   (parcouru : {len(lc.splitlines())} ligne(s) de `lecture-campagnes.txt`, dont {len(rangees_lc)} de campagne)")
tot_et = {"lue chemin": 0, "lue hors chemin": 0, "non prouvée (R1)": 0, "non classée": 0}
for l in rangees_lc:
    fin_l = l.split(" OUI ", 1)[1] if " OUI " in l else ""
    for lib, n in re.findall(r"(lue chemin|lue hors chemin|non prouvée \(R1\)|non classée) (\d+)", fin_l):
        tot_et[lib] += int(n)
m = re.search(r"ÉTIQUETTES : lue chemin (\d+) · lue hors chemin (\d+) · non prouvée \(R1\) (\d+) · non classée (\d+) · somme (\d+)", lc)
cel = ligne_tab("étiquettes")
mt = re.search(r"lue chemin (\d+) · lue hors chemin (\d+) · non prouvée \(R1\) (\d+) · non classée (\d+) ; somme (\d+)", cel[2])
txt_et = [int(x) for x in mt.groups()] if mt else None
ctl("R28", "étiquettes : le texte (13 · 27 · 81 · 295, somme 416) = la ligne ÉTIQUETTES de la pièce = la somme RECOMPTÉE sur les 34 lignes de campagne ; les quatre premières valeurs = la prédiction du protocole",
    (txt_et, txt_et, list(pred["etiq"]) if pred["etiq"] else None), ([int(x) for x in m.groups()] if m else None, list(tot_et.values()) + [sum(tot_et.values())], (txt_et[:4] if txt_et else None)))
ctl("R28b", "étiquettes : la somme des étiquettes = les mordues certifiantes (416)", tg[0] if tg else None, sum(tot_et.values()))

# ── lecture à la main de R26
cel = ligne_tab("lecture à la main")
lm = piece("lecture-main-r26.txt")
motifs_r2 = [r"Test timeout of", r"Test ended", r"locator\.(click|fill|press)", r"page\.(goto|waitFor)", r"Timeout \d+ms exceeded", r"exceeded while"]
comptes_r2 = {}
for k in range(1, 5):
    ex_r = [f for f in arbre_fin if f.endswith(f"/lecture-r26/R26-{k}.txt")]
    comptes_r2[k] = [len(re.findall(p, show(FIN, ex_r[0]) if ex_r else "", re.I)) for p in motifs_r2]
n_sig = int(re.search(r"(\d+) signature de la règle 2", cel[2])[1])
ctl("R29", "lecture à la main de R26 : « 0 signature de la règle 2 sur les quatre extraits » — les quatre extraits existent et les six motifs (délai de test, d'action) comptent 0 chacun, RECOMPTÉ ici sur les extraits", ([[n_sig] * 6] * 4, 4), ([comptes_r2[k] for k in range(1, 5)], len([f for f in arbre_fin if "/lecture-r26/R26-" in f])))
ctl("R30", "lecture à la main de R26 : la pièce dit « règle 1 satisfaite » et « 0, 0, 0, 0, 0, 0 pour chacun des quatre extraits »", (True, True), ("La règle 1 est satisfaite" in lm, "0, 0, 0, 0, 0, 0" in lm))

# ── échantillonneur : recomptage ligne à ligne de etat.csv
csvt = piece("etat.csv").lstrip("\ufeff")
rows = list(csv.reader(csvt.splitlines(), delimiter=";"))
h, data = rows[0], rows[1:]
ix = {n: h.index(n) for n in h}
from datetime import datetime
ts = [datetime.strptime(r[ix["horodatage"]], "%Y-%m-%d %H:%M:%S") for r in data]
ecarts_s = [(ts[i + 1] - ts[i]).total_seconds() for i in range(len(ts) - 1)]
fenetre_min = round((ts[-1] - ts[0]).total_seconds() / 60, 1)
perf100 = sum(1 for r in data if float(r[ix["perf_pct"]]) > 100)
cel = ligne_tab("échantillonneur")
m1 = re.search(r"(\d+) échantillons sur ([\d,]+) min, (\d+) échec-instrument, (\d+) transition, (\d+) trou, (\w+) seul, chrome max (\d+), écarts (\d+)-(\d+) s ; PERF > 100 sur (\d+) échantillons sur (\d+)", cel[2])
txt_s = ([int(m1[1]), float(m1[2].replace(",", ".")), [m1[6]], int(m1[7]), int(m1[8]), int(m1[9]), int(m1[10]), int(m1[11])]) if m1 else None
ctl("R31", "échantillonneur : « 326 échantillons sur 171,4 min », SECTEUR seul, `chrome` max 0, écarts 31-34 s, `PERF` > 100 sur 295 sur 326 = `etat.csv` RECOMPTÉ ligne à ligne (pas le résumé)", txt_s,
    [len(data), fenetre_min, sorted(set(r[ix["alim"]] for r in data)), max(int(r[ix["chrome"]]) for r in data), int(min(ecarts_s)), int(max(ecarts_s)), perf100, len(data)])
er = piece("etat-resume.txt")
ctl("R32", "échantillonneur : « 0 échec-instrument, 0 transition, 0 trou » (texte) = `etat-resume.txt` ; l'effectif (326) = ECHANTILLONS ; aucun écart entre deux échantillons au-delà de 60 s (recomptage)",
    ([int(m1[1]), int(m1[3]), int(m1[4]), int(m1[5]), 0]) if m1 else None, [int(re.search(r"ECHANTILLONS=(\d+)", er)[1]), int(re.search(r"ECHEC-INSTRUMENT=(\d+)", er)[1]), int(re.search(r"TRANSITIONS_ALIMENTATION=(\d+)", er)[1]), int(re.search(r"TROUS_DANS_LA_SERIE=(\d+)", er)[1]), sum(1 for e in ecarts_s if e > 60)])
prog = piece("progression.txt")
prog_l = [l for l in prog.split("\n") if l.strip()]
t_ouv = datetime.strptime(prog_l[0][:19], "%d/%m/%Y %H:%M:%S")
t_clo = datetime.strptime(prog_l[-1][:19], "%d/%m/%Y %H:%M:%S")
m3 = re.search(r"Passe r36a-20261012-1651, (\d\d:\d\d:\d\d) → (\d\d:\d\d:\d\d) \(([\d,]+) min\)", txt_prop)
ctl("R33", "la passe : « 16:51:08 → 19:44:31 (173,4 min) » = premier et dernier horodatages de `progression.txt`", (m3[1], m3[2], float(m3[3].replace(",", "."))) if m3 else None, (t_ouv.strftime("%H:%M:%S"), t_clo.strftime("%H:%M:%S"), round((t_clo - t_ouv).total_seconds() / 60, 1)))

# ── l'arbre
cel = ligne_tab("arbre")
marbre = re.match(r"immobile sur (\w+) aux (\w+) contrôles, (\d+) ligne de statut à chacun", cel[2])
nb_mots = {"SIX": 6}
arbres = []
for k in range(1, 7):
    t = piece(f"arbre-{k}.txt")
    corps = t.split("--- git status --porcelain (vide exigé)\n", 1)[1].split("--- fin")[0] if "--- git status" in t else None
    arbres.append((re.search(r"^HEAD (\w+)", t, re.M)[1][:7], len(corps.strip().splitlines()) if corps is not None else None))
ctl("R34", "arbre : « immobile sur 4202dd4 aux SIX contrôles, 0 ligne de statut à chacun » = `arbre-1.txt` à `arbre-6.txt` (HEAD et statut)", [(marbre[1], int(marbre[3]))] * nb_mots[marbre[2]] if marbre else None, arbres)
ctl("R35", "arbre : aucun fichier « …-NON-CONFORME » dans la passe", [], [f for f in arbre_fin if "NON-CONFORME" in f])
print(f"   (parcouru : {len(arbre_fin)} fichier(s) de la passe ; {sum(1 for f in arbre_fin if re.search(r'/arbre-\d\.txt$', f))} fichier(s) `arbre-N.txt`)")

# ── 0 valeur réelle
av, ac = show(FIN, f"{PD}/aucune-valeur-reelle.txt"), show(FIN, f"{PD}/aucun-cookie-reel.txt")
mv = re.search(r"valeurs cherchées : (\d+) \((\d+) journal.*?parcourus : (\d+) fichiers.*?porteurs : (\d+)", av)
mc = re.search(r"valeurs cherchées : (\d+) \((\d+) journal.*?parcourus : (\d+) fichiers.*?porteurs : (\d+)", ac)
cel = ligne_tab("« 0 valeur réelle »")
m4 = re.search(r"(\d+) valeurs cherchées \((\d+) journaux avec jetons\), ([\d ]+) fichiers, (\d+) porteur ; contrôle cookie : (\d+) valeurs \((\d+) journaux\), ([\d ]+) fichiers, (\d+) porteur", cel[2])
ctl("R36", "« 0 valeur réelle » : (valeurs, journaux, fichiers, porteurs) du texte = les deux dernières lignes des pièces (jetons, puis cookies)", ([int(m4[1]), int(m4[2]), int(m4[3].replace(" ", "")), int(m4[4]), int(m4[5]), int(m4[6]), int(m4[7].replace(" ", "")), int(m4[8])]) if m4 else None, ([int(x) for x in mv.groups()] + [int(x) for x in mc.groups()]) if mv and mc else None)

# ── rejeux des deux specs hors suite
rj1, rj2 = show(FIN, f"{PD}/rejeu-specs/r32-nouvelle-reservation-EXTRAIT.txt"), show(FIN, f"{PD}/rejeu-specs/r30-lien-calendrier-pro-EXTRAIT.txt")
a1, a2 = re.search(r"(\d+) passed \(([\d.]+)s\)", rj1), re.search(r"(\d+) passed \(([\d.]+)s\)", rj2)
cel = ligne_tab("rejeu")
m5 = re.search(r"r32-nouvelle-reservation : (\d+) passés \(([\d,]+) s\) ; spec du lien : (\d+) passés \(([\d,]+) s", cel[2])
ctl("R37", "rejeu des deux specs : « 5 passés (57,5 s) » et « 2 passés (55,5 s) » = les `N passed (…s)` des deux extraits", ([int(m5[1]), float(m5[2].replace(",", ".")), int(m5[3]), float(m5[4].replace(",", "."))]) if m5 else None, [int(a1[1]), float(a1[2]), int(a2[1]), float(a2[2])] if a1 and a2 else None)

# ── inventaires
inv = {}
for nom, chemin in (("ouverture", f"{PASSE}/inventaire-ouverture.txt"), ("après e2e", f"{PASSE}/inventaire-apres-e2e.txt"), ("clôture", f"{PASSE}/inventaire-cloture.txt"),
                    ("avant rejeu", f"{PD}/rejeu-specs/inventaire-avant-rejeu.txt"), ("après rejeu", f"{PD}/rejeu-specs/inventaire-apres-rejeu.txt")):
    inv[nom] = comptes_inventaire(show(FIN, chemin))
cel = ligne_tab("inventaires")
m6 = re.search(r"chrome (\d+) et headless_shell (\d+) .*?node (\d+) à chacun ; msedge (\d+)", cel[2])
ctl("R38", "inventaires : « chrome 0 et headless_shell 0 … node 0 à chacun ; msedge 5 » = les cinq relevés (ouverture, après e2e, clôture, avant et après le rejeu)", [tuple(int(m6[i]) for i in (1, 2, 3, 4))] * 5 if m6 else None, [(v.get("chrome"), v.get("headless_shell"), v.get("node"), v.get("msedge")) for v in inv.values()])

# ── RAM et porte dure (paragraphe du résultat)
s1, s2, sc = champs_sonde(piece("sonde-ouverture-1.txt")), champs_sonde(piece("sonde-ouverture-2.txt")), champs_sonde(piece("sonde-cloture.txt"))
fl = lambda s: float(s.replace(" ", "").replace(",", "."))
m6 = re.search(r"RAM ([\d ]+,\d) \(bande ([\d ]+)-([\d ]+)\) puis ([\d ]+,\d) \(([\d ]+)-([\d ]+)\), barre imprimée ([\d ]+)", txt_prop)
ctl("R39", "porte dure à l'ouverture : « RAM 4 897,5 (4 880-4 933) puis 4 929,5 (4 924-4 945), barre 4 579 » = `sonde-ouverture-1/2.txt` ; `porte-dure.txt` = VERTE ; `chrome` 0, `node` 0, SECTEUR aux deux relevés",
    ([fl(m6[i]) for i in range(1, 8)], "VERTE", ("0", "0", "SECTEUR"), ("0", "0", "SECTEUR")) if m6 else None,
    ([float(s1["RAM_MEDIANE_MO"]), s1["BANDE"][0], s1["BANDE"][1], float(s2["RAM_MEDIANE_MO"]), s2["BANDE"][0], s2["BANDE"][1], float(s1["BARRE_D273_MO"])], piece("porte-dure.txt").strip(), (s1["CHROME"], s1["NODE"], s1["ALIM_SOURCE"]), (s2["CHROME"], s2["NODE"], s2["ALIM_SOURCE"])))
noms_sondes = sorted(f for f in arbre_fin if re.search(r"/sonde-[^/]+\.txt$", f))
sous = [f for f in noms_sondes if sous_la_barre(champs_sonde(show(FIN, f)))]
barre_val = float(s1["BARRE_D273_MO"])
sous_csv = [r for r in data if float(r[ix["ram_libre_mo"]]) < barre_val]
node0 = [r for r in data if r[ix["node"]] == "0"]
node0_sous = [r for r in node0 if float(r[ix["ram_libre_mo"]]) < barre_val]
m7 = re.search(r"(\d+) relevés de sonde sur (\d+) sont sous ([\d ]+) Mo, dont la clôture \(([\d ]+,\d), bande ([\d ]+)-([\d ]+)\), et (\d+) échantillons sur (\d+) à node = 0 \(min ([\d ]+)\) ; (\d+) échantillons sur (\d+) sont sous la barre, (\d+) avec des node", txt_prop)
ctl("R40", "l'ambiant : « 11 relevés de sonde sur 21 sont sous 4 579 Mo, dont la clôture (4 368,5, 4 357-4 376), et 12 échantillons sur 23 à node = 0 (min 3 888) ; 310 sur 326 sous la barre, 298 avec des node » = RECOMPTÉ sur les 21 sondes et `etat.csv`",
    ([fl(m7[1]), fl(m7[2]), fl(m7[3]), fl(m7[4]), fl(m7[5]), fl(m7[6]), fl(m7[7]), fl(m7[8]), fl(m7[9]), fl(m7[10]), fl(m7[11]), fl(m7[12])]) if m7 else None,
    [float(len(sous)), float(len(noms_sondes)), barre_val, float(sc["RAM_MEDIANE_MO"]), float(sc["BANDE"][0]), float(sc["BANDE"][1]), float(len(node0_sous)), float(len(node0)), min(float(r[ix["ram_libre_mo"]]) for r in node0), float(len(sous_csv)), float(len(data)), float(len(sous_csv) - len(node0_sous))])


def inv150(t):
    return {m.group(1): int(m.group(3)) for m in re.finditer(r"^(\S[^\n]*?) (\d+) (\d+)$", t, re.M)}


i0, i1 = inv150(piece("sonde-ouverture-1.txt")), inv150(piece("sonde-cloture.txt"))
m8 = re.search(r"vmmemWSL (\d+) → (\d+) Mo[^;]*?, powershell (\d+) → (\d+) Mo[^;]*?, l'IDE \+(\d+) Mo", txt_prop)
ctl("R41", "ce qui a bougé entre l'ouverture et la clôture : « vmmemWSL 395 → 792, powershell 357 → 590, l'IDE +110 » = les inventaires > 150 Mo des deux sondes (`Code` = l'IDE)",
    [int(x) for x in m8.groups()] if m8 else None, [i0.get("vmmemWSL"), i1.get("vmmemWSL"), i0.get("powershell"), i1.get("powershell"), i1.get("Code", 0) - i0.get("Code", 0)])
d324_tout = [f for f in git("ls-tree", "-r", "--name-only", FIN, "--", "docs/preuves/D324").decode().split("\n") if f.endswith("campagnes-tout.heures")]
t324 = duree_code(show(FIN, d324_tout[0]))[0] if len(d324_tout) == 1 else None
m9 = re.search(r"a été de ([\d ]+) s \((\d+) min\) contre ([\d ]+) s à D324", txt_prop)
ctl("R42", "« 5 504 s (92 min) contre 3 313 s à D324 » = `campagnes-tout.heures` des deux passes (les minutes arrondies)", [int(m9[1].replace(" ", "")), int(m9[2]), int(m9[3].replace(" ", ""))] if m9 else None, [duree_code(piece("campagnes-tout.heures"))[0], round(duree_code(piece("campagnes-tout.heures"))[0] / 60), t324])


# ══ FAMILLE D — le diagnostic du `.env` (2 échecs sur 10, puis 10 sur 10) contre ses pièces ═════════════════════════════════
print("\n== D — le diagnostic non certifiant de `test:int` (deux bras, deux fichiers de test) contre ses pièces")
DIAG = f"{PD}/diagnostic-test-int"
sans = show(FIN, f"{DIAG}/bras-sans-surcharge-EXTRAIT.txt")
avec = show(FIN, f"{DIAG}/bras-avec-client-url-EXTRAIT.txt")
b_sans, b_avec = bilans_vitest(sans), bilans_vitest(avec)
m_a = re.search(r"bras sans surcharge : (\d+) échecs, (\d+) passés \((\d+)\), code (\d)", txt_prop)
m_b = re.search(r"bras CLIENT_URL=http://localhost:3000 en variable d'environnement \(dotenv ne l'écrase pas\) : (\d+) passés sur (\d+), code (\d)", txt_prop)
ctl("D1", "bras SANS surcharge : le texte (2 échecs, 8 passés, 10, code 1) = le résumé de l'extrait (tests en échec, passés, total) et la ligne d'erreur de pnpm « exit code 1 »",
    [int(m_a[1]), int(m_a[2]), int(m_a[3]), int(m_a[4])] if m_a else None, [b_sans[0][1][1], b_sans[0][1][0], b_sans[0][1][2], int(re.search(r"exit code (\d)", sans)[1]) if re.search(r"exit code (\d)", sans) else None])
ctl("D2", "bras AVEC `CLIENT_URL` : le texte (10 passés sur 10, code 0) = le résumé de l'extrait ; aucun échec, aucune ligne d'erreur de pnpm (le code 0 n'est pas imprimé : son absence est la mesure)",
    [int(m_b[1]), int(m_b[2]), int(m_b[3])] if m_b else None, [b_avec[0][1][0], b_avec[0][1][2], 0 if (b_avec[0][1][1] == 0 and "exit code" not in avec and "ERR_PNPM" not in avec) else None])
m_t = re.search(r"Les deux tests en échec : ([\w\-]+\.int-spec\.ts) \(« (.*?) »\) et ([\w\-]+\.int-spec\.ts) \(« (.*?) »\)", txt_prop)
txt_fichiers = sorted([(m_t[1], 1), (m_t[3], 1)]) if m_t else None
ctl("D3", "les deux fichiers de test de l'extrait SANS surcharge sont ceux que le texte nomme, chacun avec UN test en échec (un titre par fichier dans le texte) ; l'extrait AVEC surcharge n'a aucun test en échec",
    (txt_fichiers, 0), (sorted((re.search(r"test/int/([\w\-.]+)", l)[1], int(re.search(r"(\d+) failed", l)[1])) for l in sans.split("\n") if re.match(r"^ ❯ test/int/\S+ \(\d+ tests? \| \d+ failed\)", l)), len(re.findall(r"^\s*×", avec, re.M))))
echoues = [l.strip() for l in sans.split("\n") if re.match(r"^\s{3}×", l)]
titres = [m_t[2], m_t[4]] if m_t else []
ctl("D4", "les deux tests en échec ont les titres du texte (chacun est contenu dans une ligne « × » de l'extrait)", [True] * len(titres), [any(t in l for l in echoues) for t in titres])
ctl("D5", "les deux assertions en échec attendent `http://localhost:3000` : une ligne « → expected … » par test, qui nomme l'hôte local", len(titres), len(re.findall(r"^\s+→ expected '.*(?:to match /http:\\/\\/localhost:3000|to contain 'http://localhost:3000)", sans, re.M)))
en_tete = [l for l in sans.split("\n") if l.startswith("# ")]
mh = re.search(r"SHA-256 du journal COMPLET : ([0-9a-f]{64}) \((\d+) octets, (\d+) lignes\)", sans)
mr = re.search(r"(\d+) ligne\(s\) retirée\(s\)", sans)
corps = sans.split("\n")[len(en_tete):]
corps = corps[:-1] if corps and corps[-1] == "" else corps
ctl("D6", "l'extrait SANS surcharge : lignes du journal complet (82, écrit dans son en-tête) = lignes de l'extrait après l'en-tête + lignes retirées (2)", int(mh[3]) if mh else None, (len(corps) + int(mr[1])) if mr else None)
print(f"   (parcouru : {len(sans.splitlines())} ligne(s) de l'extrait SANS, {len(avec.splitlines())} de l'extrait AVEC ; en-tête : {len(en_tete)} ligne(s) ; corps : {len(corps)} ; retirées : {mr[1] if mr else None})")
non_verifiable("N3", f"l'empreinte SHA-256 du journal COMPLET du bras SANS surcharge ({mh[1][:12] + '…' if mh else 'absente'}), ses {mh[2] if mh else '?'} octets et ses {mh[3] if mh else '?'} lignes : le journal brut est HORS dépôt (il portait deux jetons et un hôte de tunnel)")
non_verifiable("N4", "la VALEUR du `.env` à l'époque (`CLIENT_URL` sur un tunnel, modifié le 12/10 à 11:43:41) : elle n'est dans aucune pièce — l'hôte a été retiré de l'extrait, et le fichier a été modifié depuis (état LIVE ci-dessus). "
                     "Seul le diagnostic (2 échecs sur 10 contre 10 sur 10, mêmes fichiers de test) en porte la trace, et il ne prouve que « une variable `CLIENT_URL` non locale suffit à faire échouer ces deux tests »")
dot_main = os.path.join("node_modules", ".pnpm", "dotenv@16.6.1", "node_modules", "dotenv", "lib", "main.js")
dot_txt = open(dot_main, encoding="utf-8").read() if os.path.exists(dot_main) else ""
ctl("D7", "« `dotenv` ne l'écrase pas » (état VIVANT de la dépendance de l'API, `dotenv@16.6.1`) : `override` vaut faux sauf option explicite, et une variable déjà définie n'est réécrite que si `override === true`",
    (True, True), ("const override = Boolean(options && options.override)" in dot_txt, bool(re.search(r"hasOwnProperty\.call\(processEnv, key\)\) \{\s+if \(override === true\) \{\s+processEnv\[key\] = parsed\[key\]", dot_txt))))
dep_api = show(FIN, "apps/api/package.json")
ctl("D8", "l'API déclare bien `dotenv` en 16.x (c'est la version dont le comportement vient d'être lu)", True, bool(re.search(r'"dotenv": "\^16\.', dep_api)))
src_setup = show(FIN, "apps/api/test/int/setup-env.ts")
ctl("D9", "`apps/api/test/int/setup-env.ts` importe `dotenv/config` ET ne fixe PAS `CLIENT_URL` (c'est le défaut que D329 décrit : le `.env` entre dans `test:int`)", (True, False), ('import "dotenv/config"' in src_setup, "CLIENT_URL" in src_setup))
print(f"   (parcouru : {len(src_setup.splitlines())} ligne(s) de `setup-env.ts` à la clôture)")

# ══ FAMILLE O — les copies d'outillage de D329 : calibration et différences avec l'original ═════════════════════════════
print("\n== O — les copies d'outillage de D329 contre leurs originaux (différences comptées et classées)")


def hunks(a, b):
    A, B = a.split("\n"), b.split("\n")
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
    return [(t, A[i1:i2], B[j1:j2]) for t, i1, i2, j1, j2 in sm.get_opcodes() if t != "equal"]


h_t = hunks("a\nb\nc", "a\nB\nc\nd")
bras("hunks, cas vrai : « b » remplacé par « B » et « d » ajouté → [replace, insert] ; cas faux : deux textes identiques → []", [x[0] for x in h_t] == ["replace", "insert"] and hunks("x\ny", "x\ny") == [])
if not all(cal):
    sys.exit("ABANDON : calibration manquée (bras de la famille O)")
orig_passe, copie_passe = show(FIN, "docs/preuves/D319/outils/passe.py"), show(FIN, f"{PD}/outils/passe.py")


def classe_passe(t, a, b):
    if t == "insert" and b and b[0].startswith('"""D329'):
        return "en-tête"
    if t == "insert" and any("_RE_INT = re.compile" in x for x in b):
        return "(1) _RE_INT"
    if t == "replace" and len(a) == 1 and any("_RE_INT.search" in x for x in b):
        return "(1) condition"
    if t == "insert" and b and b[0].startswith("def inventaire"):
        return "(2) def inventaire"
    if t == "insert" and len(b) == 1 and re.match(r'inventaire\("(ouverture|apres-e2e|cloture)"\)', b[0]):
        return "(2) appel"
    return "NON CLASSÉ"


hp = hunks(orig_passe, copie_passe)
decl_passe = sorted(set(re.findall(r"^  \((\d)\)", copie_passe, re.M)))
ctl("O1", "`passe.py` (D329) contre son original D319 : TOUS les morceaux sont classés par l'en-tête de la copie (en-tête ; (1) la dérivation `--int` ; (2) l'inventaire) — et chaque modification que l'en-tête déclare a au moins un morceau",
    (["1", "2"], 0), (sorted(set(re.match(r"\((\d)\)", classe_passe(*x))[1] for x in hp if classe_passe(*x).startswith("("))), sum(1 for x in hp if classe_passe(*x) == "NON CLASSÉ")))
ctl("O2", "`passe.py` : les lignes de l'original qui DISPARAISSENT sont toutes des lignes de la condition de dérivation des harnais verrouillés (« Tout le reste est le texte de D319, intact »)", True, all('["verrou"]' in l for t, a, b in hp for l in a))
print(f"   (parcouru : {len(orig_passe.splitlines())} ligne(s) de l'original, {len(copie_passe.splitlines())} de la copie ; {len(hp)} morceau(x) : lignes retirées {sum(len(a) for t, a, b in hp)}, ajoutées {sum(len(b) for t, a, b in hp)} ; classes {sorted(classe_passe(*x) for x in hp)})")
ver_o, ver_c = show(FIN, "docs/preuves/D324/outils/verser.py"), show(FIN, f"{PD}/outils/verser.py")
hv = hunks(ver_o, ver_c)
dst_o = [l for l in ver_o.split("\n") if l.startswith("DST = ")]
dst_c = [l for l in ver_c.split("\n") if l.startswith("DST = ")]
ctl("O3", "`verser.py` (D329) contre D324 : l'en-tête et la ligne `DST` sont les seuls morceaux ; `DST` ne diffère que par `D324` → `D329`, et cette ligne est la SEULE occurrence de code (« une occurrence de code, comptée »)",
    (["DST", "en-tête"], True, 1), (sorted("DST" if (a and a[0].startswith("DST = ")) else "en-tête" for t, a, b in hv), len(dst_o) == len(dst_c) == 1 and dst_c[0] == dst_o[0].replace("D324", "D329"), sum(1 for l in ver_c.split("\n")[3:] if "D329" in l and not l.startswith("#"))))
lc_o, lc_c = show(FIN, "docs/preuves/D324/outils/lire-campagnes.py"), show(FIN, f"{PD}/outils/lire-campagnes.py")
hl = hunks(lc_o, lc_c)


def classe_lc(t, a, b):
    if t == "insert" and b and b[0].startswith('"""D329'):
        return "en-tête"
    if t == "insert" and b and b[0].startswith("# [D329 (2)]"):
        return "(2) import r32/r33"
    if t == "replace" and len(a) == 1 and "D324/plancher/plancher.txt" in a[0] and b[0] == a[0].replace("D324", "D329"):
        return "(1) chemin du plancher"
    if t == "replace" and a and "simulation-sortie.txt" in a[0] and any("fichier_sim" in x for x in b):
        return "(1) simulation composée"
    if t == "replace" and len(a) == 2 and "len(sim) == 28" in a[0] and "len(sim) == 30" in b[0] and "attendu 28" in a[1] and "attendu 30" in b[1]:
        return "(1) 28 → 30"
    if t == "replace" and b and any(x.startswith("# [D329 (3)]") for x in b):
        return "(3) bras de plus"
    return "NON CLASSÉ"


cll = sorted(classe_lc(*x) for x in hl)
ctl("O4", "`lire-campagnes.py` (D329) contre D324 : six morceaux, tous classés par les modifications déclarées (en-tête ; (1) chemin du plancher, simulation composée, 28 → 30 ; (2) import r32/r33 ; (3) les bras de plus) ; aucun non classé",
    sorted(["en-tête", "(2) import r32/r33", "(1) chemin du plancher", "(1) simulation composée", "(1) 28 → 30", "(3) bras de plus"]), cll)
n_bras_o = len(re.findall(r"^b\d+ = ", lc_o, re.M))
n_bras_c = len(re.findall(r"^b\d+ = ", lc_c, re.M))
mots_nb = {"DEUX": 2, "deux": 2, "QUATRE": 4, "quatre": 4}
decl_plus = re.search(r"(DEUX) BRAS DE CALIBRATION DE PLUS sur `r33`.*? et (deux) sur `r32`", lc_c, re.S)
ctl("O5", "le nombre de bras que `lire-campagnes.py` ajoute est celui que son en-tête déclare (« DEUX bras … sur `r33` … et deux sur `r32` », donc 4)", mots_nb[decl_plus[1]] + mots_nb[decl_plus[2]], n_bras_c - n_bras_o)
cal_o = len(re.findall(r"^  ✓", show(FIN, "docs/preuves/D324/outils/lire-campagnes-calibration.txt"), re.M))
cal_c = len(re.findall(r"^  ✓", show(FIN, f"{PD}/outils/lire-campagnes-calibration.txt"), re.M))
ctl("O6", "les sorties de calibration versées disent ce que le code compte (bras `bN = …` du source) : D324 et D329", (n_bras_o, n_bras_c), (cal_o, cal_c))
mq = re.search(r"quatre bras de calibration de plus", txt_prop)
constat("O-C1", f"D329 écrit « quatre bras de calibration de plus … 12 bras sur 12 » ({'texte trouvé' if mq else 'texte NON retrouvé'}) : D324 en avait {n_bras_o} (pas 8), D329 en compte {n_bras_c} — soit {n_bras_c - n_bras_o} de plus, dont QUATRE à deux issues "
                "(positif/négatif sur r33 et r32) et UN contrôle de déclaration (`b12` : r32 65 cibles non verrouillé, r33 102 cibles verrouillé), qui n'a pas de bras négatif. Le total « 12 sur 12 » est exact ; le « +4 » ne l'est pas. "
                "Écart d'exactitude d'un compte écrit dans un texte, sans effet sur une porte ni sur un chiffre certifiant.")
sm_o, sm_c = show(FIN, "docs/preuves/D324/plancher/simuler-non-demarrage.py"), show(FIN, f"{PD}/plancher/simuler-non-demarrage.py")
hs = hunks(sm_o, sm_c)
renommages = [x for x in hs if x[0] == "replace" and len(x[1]) == len(x[2]) and all(re.sub(r"[dD]329", lambda m: m[0][0] + "324", c) == o for o, c in zip(x[1], x[2])) and any(re.search(r"[dD]324", o) for o in x[1])]
reste = [x for x in hs if x not in renommages]
MARQUES = ('[D329', 'MESURER', 'ARGV_PAR_HARNAIS', '"""D329', 'À D324', 'à mesurer')
ctl("O7", "`simuler-non-demarrage.py` (D329) contre D324 : chaque morceau qui n'est pas un renommage `D324` → `D329` porte une marque de modification déclarée (`[D329 (n)]`, `MESURER`, `ARGV_PAR_HARNAIS`, « À D324 », « à mesurer », l'en-tête)", [], [(a[0][:60] if a else "") for t, a, b in reste if not any(mq_ in "\n".join(b) for mq_ in MARQUES)])
lignes_ren_o = sum(1 for x in renommages for o in x[1] if re.search(r"[dD]324", o))
occ_ren_o = sum(len(re.findall(r"[dD]324", o)) for x in renommages for o in x[1])
code_o = sm_o.split("\n")[8:]            # hors les huit lignes du docstring propre à D324
lignes_code_o = sum(1 for l in code_o if re.search(r"[dD]324", l))
occ_code_o = sum(len(re.findall(r"[dD]324", l)) for l in code_o)
code_c = sm_c.split("\n")[13:]           # hors les treize lignes de l'en-tête propre à D329
lignes_code_c = sum(1 for l in code_c if re.search(r"[dD]329", l))
decl_16 = re.search(r"tout nom `D324`/`d324` du CODE devient `D329`/`d329` .*?— (\d+) occurrences", sm_c, re.S)
lignes_tout_o = sum(1 for l in sm_o.splitlines() if re.search(r"d324", l, re.I))
lignes_tout_c = sum(1 for l in sm_c.splitlines() if re.search(r"d329", l, re.I))
ctl("O8", "le nombre « 16 » de l'en-tête (« comptées par `grep -c` avant et après : 16 → 0, puis 16 ») = les lignes de l'original ENTIER qui portent `d324` (`grep -c -i`)", int(decl_16[1]) if decl_16 else None, lignes_tout_o)
print(f"   (parcouru : {len(hs)} morceau(x) ; renommages purs {len(renommages)} = {lignes_ren_o} ligne(s), {occ_ren_o} occurrence(s) ; original : {lignes_tout_o} ligne(s) au total dont {lignes_code_o} de code hors les huit lignes de son en-tête ({occ_code_o} occurrence(s)) ; copie : {lignes_tout_c} ligne(s) portent `d329`, dont {lignes_code_c} hors l'en-tête ; autres morceaux {len(reste)})")
if decl_16 and lignes_code_o != int(decl_16[1]):
    constat("O-C2", f"l'en-tête de `simuler-non-demarrage.py` (D329) écrit « tout nom `D324`/`d324` du CODE … — {decl_16[1]} occurrences, comptées par `grep -c` avant et après (16 → 0, puis 16) » : le `grep -c -i` sur l'original ENTIER rend bien {lignes_tout_o}, mais il compte aussi les lignes de l'en-tête de D324 "
                    f"({lignes_tout_o - lignes_code_o} lignes) que la copie remplace ; les lignes de CODE sont {lignes_code_o} ({occ_code_o} occurrences). Le « 16 » est un compte de lignes du fichier entier, pas du seul code ; le « puis 16 » ne se recompte pas ({lignes_tout_c} lignes portent `d329` aujourd'hui, nouvelles lignes comprises). "
                    "Imprécision d'un commentaire d'outil, sans effet sur la mesure (la passe a prouvé les noms cohérents en s'exécutant).")
ctl("O9", "`balayage.py` (D329) est la copie à l'OCTET de celui de D328 (même objet git)", blob(FIN, "docs/preuves/D328/passe-d277/balayage.py"), blob(FIN, f"{PD}/passe-d277/balayage.py"))


def blobs_h(sha):
    out = {}
    for l in git("ls-tree", "-r", sha, "--", "neutralisation").decode().splitlines():
        meta, chemin = l.split("\t")
        out[chemin] = meta.split()[2]
    return out


b0, b1 = blobs_h(D324), blobs_h(FIN)
est_h = lambda c: c.startswith("neutralisation/neutralize-") and c.endswith(".py")
nom_h = lambda c: c[len("neutralisation/neutralize-"):-3]
H0 = {nom_h(c): b for c, b in b0.items() if est_h(c)}
H1 = {nom_h(c): b for c, b in b1.items() if est_h(c)}
inch = sorted(n for n in H0 if n in H1 and H0[n] == H1[n])
chg = sorted(n for n in H0 if n in H1 and H0[n] != H1[n])
neufs = sorted(n for n in H1 if n not in H0)
autres_chg = sorted(c for c in set(b0) | set(b1) if not est_h(c) and b0.get(c) != b1.get(c))
sortie_der = show(FIN, f"{PD}/plancher/deriver-plancher-sortie.txt")
mi = re.search(r"inchangés \(blob identique\) : (\d+) · changés : (\[.*?\]) · neufs : (\[.*?\])", sortie_der)
ctl("O10", "la dérivation des planchers : harnais inchangés / changés / neufs RECALCULÉS sur les objets git (D324 contre la clôture) = ce que `deriver-plancher-sortie.txt` dit", (int(mi[1]), sorted(eval(mi[2])), sorted(eval(mi[3]))) if mi else None, (len(inch), chg, neufs))
ctl("O11", "aucune pièce de `neutralisation/` AUTRE qu'un harnais n'a changé entre D324 et la clôture de D329", [], autres_chg)
print(f"   (parcouru : {len(H0)} harnais à D324 · {len(H1)} à la clôture ; {len(b0)} / {len(b1)} pièces de `neutralisation/`)")
pl_c = {m[1]: float(m[3]) for m in re.finditer(r"^P (\S+) (\S+) ([\d.]+)$", show(FIN, f"{PD}/plancher/plancher.txt"), re.M)}
pl_0 = {m[1]: float(m[3]) for m in re.finditer(r"^P (\S+) (\S+) ([\d.]+)$", show(FIN, "docs/preuves/D324/plancher/plancher.txt"), re.M)}
sim_t = {m[1]: float(m[2]) for m in re.finditer(r"^T (\S+) \S+ \d+ [\d.]+ [\d.]+ ([\d.]+) ", show(FIN, f"{PD}/plancher/simulation-sortie.txt"), re.M)}
mcomp = re.search(r"planchers composés : (\d+) .*?· mesurés (\d+) .*?· repris (\d+)", sortie_der)
ctl("O12", "`plancher.txt` (D329) : (composés, mesurés, repris) de la dérivation = ses lignes ; les repris sont ceux de D324 chiffre pour chiffre ; les mesurés valent 3 × T (T lu dans la table de la simulation), arrondi à deux décimales",
    ([int(x) for x in mcomp.groups()], True, True) if mcomp else None,
    ([len(pl_c), len(sim_t), sum(1 for n, v in pl_c.items() if n in pl_0 and n not in sim_t and pl_0[n] == v)], len(pl_c) - len(sim_t) == sum(1 for n, v in pl_c.items() if n in pl_0 and n not in sim_t and pl_0[n] == v), all(abs(pl_c[n] - round(3 * t, 2)) < 1e-9 for n, t in sim_t.items())))
sim_txt = show(FIN, f"{PD}/plancher/simulation-sortie.txt")
mb = re.search(r"calibration à (\w+) bras, (\d+) bras manqué", txt_prop)
ctl("O13", "la simulation de l'étape 0 : « calibration à trois bras, 0 bras manqué » (texte) = trois sections « CALIBRATION (a/b/c) » et « BRAS ET DÉFAUTS MANQUÉS : 0 » dans `simulation-sortie.txt`", ({"trois": 3}.get(mb[1]), int(mb[2])) if mb else None, (len(re.findall(r"^== CALIBRATION \([abc]\)", sim_txt, re.M)), int(re.search(r"BRAS ET DÉFAUTS MANQUÉS : (\d+)", sim_txt)[1])))
print(f"   (parcouru : {len(sim_txt.splitlines())} ligne(s) de `simulation-sortie.txt` ; {len(pl_c)} planchers ; {len(pl_0)} planchers de D324)")


# Les outils NEUFS de D329 (pas des copies) : leurs calibrations sont REJOUÉES ici, depuis l'objet git de la clôture, dans un dossier temporaire (lecture seule : aucun fichier du dépôt n'est écrit)
tmp = tempfile.mkdtemp(prefix="zwadj-d330-lecture-")


def rejouer(chemin_git, args=()):
    dest = os.path.join(tmp, os.path.basename(chemin_git))
    open(dest, "wb").write(git("show", f"{FIN}:{chemin_git}"))
    r = subprocess.run([sys.executable, dest, *args], capture_output=True, cwd=os.getcwd())
    return r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace"), r.returncode


sortie_ext, code_ext = rejouer(f"{PD}/outils/extraire-testint.py")
ctl("O14", "`extraire-testint.py` (outil NEUF de D329) : sa calibration rejouée depuis l'objet git de la clôture rend « positif ✓ · négatif ✓ » (le script sort ensuite en erreur d'usage : aucun journal ne lui est donné)", (True, True), ("positif (jeton + hôte de tunnel retirés, neutres gardés) ✓" in sortie_ext, "négatif (rien à retirer, identique) ✓" in sortie_ext))
sortie_inv, code_inv = rejouer(f"{PD}/outils/inventaire.py", ("lecture-d330",))
ctl("O15", "`inventaire.py` (outil NEUF de D329) : sa calibration rejouée (un processus connu compté, un nom forgé à 0) rend ✓ ✓ et le relevé compte six noms ; il sort en 0", (True, True, True, 0), ("positif (powershell compté ≥ 1) ✓" in sortie_inv, "négatif (nom forgé = 0) ✓" in sortie_inv, "noms parcourus : 6, attendu 6" in sortie_inv, code_inv))
ctl("O16", "`deriver-plancher.py` (outil NEUF) : la sortie versée porte ses deux bras de calibration, positif (un harnais changé est REFUSÉ) et négatif (un harnais inchangé est ACCEPTÉ), tous deux ✓", (1, 1), (len(re.findall(r"^  ✓ calibration : positif", sortie_der, re.M)), len(re.findall(r"^  ✓ calibration : négatif", sortie_der, re.M))))
print(f"   (rejoués : extraire-testint.py {len(sortie_ext.splitlines())} ligne(s) de sortie · inventaire.py {len(sortie_inv.splitlines())} ligne(s) ; dossier temporaire hors dépôt)")

# ══ FAMILLE Q — les textes de D329 ═════════════════════════════════════════════════════════════════════════════════════════
print("\n== Q — les textes de D329 (les trois `.md` à la clôture) et ses pièces")
cont_brut = show(FIN, CONT)
reg = [l for l in cont_brut.split("\n") if re.match(r"^\| D3\d\d \|", l)]
titre_session = re.search(r"^## Session du \d\d/\d\d/\d{4} — (D\d+)", cont_brut, re.M)[1]
ctl("Q1", "la dernière ligne du registre est la dernière session datée du fichier (D329) ; « D330 » n'existe dans aucun des trois `.md` à la clôture", (titre_session, [0, 0, 0]), (re.match(r"^\| (D\d+) \|", reg[-1])[1], [show(FIN, a).count("D330") for a in AUTORITES]))
bl_dec = bloc_entre(cont_brut, "**Décisions de la session, À RATIFIER PAR KO** :", "**La dernière passe D277**") or ""
num_dec = [int(x) for x in re.findall(r"\((\d+)\) \*\*", bl_dec)]
bl_f = bloc_entre(cont_brut, "**Fautes de la session** :", "**Limites** :") or ""
num_f = [int(a or b) for a, b in re.findall(r"\((\d+)\) \*\*|\((\d+)\) ", bl_f)]
num_f6 = []
for n in num_f:
    if n == len(num_f6) + 1:
        num_f6.append(n)
ctl("Q2", "les décisions de la session D329 « à ratifier » sont numérotées de 1 à N sans trou (Ko : « les dix décisions de la session D329 » — N doit valoir 10)", (list(range(1, 11))), num_dec)
ctl("Q3", "les fautes de la session sont numérotées de 1 à N sans trou (la dernière est le retour chariot de l'extension 2 : N = 6)", list(range(1, 7)), num_f6)
defauts = show(FIN, f"{PD}/lecture-adverse/defauts-instrument.txt")
num_def = [int(x) for x in re.findall(r"^\s*(\d+)[.)] ", defauts, re.M)]
mt13 = re.search(r"Défauts de MON instrument — (\w+)", txt_prop)
nb_def = {"TREIZE": 13}.get(mt13[1]) if mt13 else None
ctl("Q4", "les défauts de l'instrument de la lecture adverse de D329 : leur nombre écrit en toutes lettres dans le texte (« TREIZE ») = les entrées numérotées de `defauts-instrument.txt`", list(range(1, nb_def + 1)) if nb_def else None, num_def)
so = show(FIN, f"{PD}/lecture-adverse/confronter-sortie.txt")
tl = tally_sortie(so)
ids = re.findall(r"^[✓✗] ([A-Z])\d", so, re.M)
vent = {k: ids.count(k) for k in sorted(set(ids))}
mq5 = re.search(r"(\d+) contrôles · (\d+) écart de D328 · (\d+) variations de l'état vivant · (\d+) constats · (\d+) non vérifiables", txt_prop)
mv5 = re.search(r"ventilation : C (\d+) · L (\d+) · P (\d+) · Q (\d+) · R (\d+) · X (\d+)", txt_prop)
mb5 = re.search(r"calibration : (\d+) bras, 0 manqué", txt_prop)
ctl("Q5", "la sortie de la lecture adverse de D329 : (contrôles, écarts + variations, bras, constats, non vérifiables), la ventilation par famille et le nombre de bras = ce que le texte annonce",
    ([int(mq5[1]), int(mq5[2]) + int(mq5[3]), int(mb5[1]), int(mq5[4]), int(mq5[5])], dict(zip("CLPQRX", (int(x) for x in mv5.groups())))) if mq5 and mv5 and mb5 else None,
    ([tl[0] + tl[1], tl[1], tl[2], tl[3], tl[4]], vent))
b1_ = show(FIN, f"{PD}/passe-d277/balayage-1-AVANT-ECRITURE.txt")
bf_ = show(FIN, f"{PD}/passe-d277/balayage-final.txt")
mp1 = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+) · motifs examinés (\d+)\nMOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", b1_)
mpf = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+) · motifs examinés (\d+)\nMOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", bf_)
mt1 = re.search(r"(\d+) occurrences, (\d+) motifs examinés, (\d+) motifs à zéro", txt_prop)
mtf = re.search(r"(\d+) occurrences dans l'arbre, (\d+) motifs examinés, (\d+) motif à zéro", txt_prop)
ctl("Q6", "la passe D277 de D329 : (occurrences, motifs examinés, motifs à zéro) de la première passe (714 · 42 · 3) et de la dernière (890 · 42 · 0) dans le texte = les dernières lignes des deux sorties", ([int(x) for x in mt1.groups()], [int(x) for x in mtf.groups()]) if mt1 and mtf else None,
    ([int(x) for x in mp1.groups()], [int(x) for x in mpf.groups()]) if mp1 and mpf else None)
section_rangs = bloc_entre(cont_brut, "## ORDRE DES RANGS", "\n## PROCHAIN LOT") or ""
ordre_dern = [l for l in section_rangs.split("\n") if l.startswith("⇒ **RANG 3")]
ctl("Q7", "l'ordre des rangs à la clôture : la dernière ligne « ⇒ RANG N » est « RANG 36 : OUVERT, NON CLOS » ; aucune ligne « ⇒ **RANG 37 » n'est écrite dans la section (le rang 37 n'existe pas)", (True, 0), (ordre_dern[-1].startswith("⇒ **RANG 36 : OUVERT, NON CLOS") if ordre_dern else False, sum(1 for l in section_rangs.split("\n") if l.startswith("⇒ **RANG 37"))))
print(f"   (parcouru : {len(section_rangs.splitlines())} ligne(s) de la section « ORDRE DES RANGS » ; {len(ordre_dern)} ligne(s) « ⇒ RANG 3x »)")
ag = show(FIN, AGENTS)
ctl("Q8", "`AGENTS.md` à la clôture porte l'annotation de D329 « LA PASSE A EU LIEU — MARQUE REFUSÉE » et le compteur DEUX inchangé", True, "MARQUE REFUSÉE" in ag and "compteur DEUX" in ag)
mp9 = re.search(r"(\d+) pièces versées", txt_prop)
ctl("Q9", "les pièces de la passe : « 191 pièces versées » (texte) = les fichiers de `passe-r36a-20261012-1651/` ; l'extension 2 en déclare autant PLUS ceux qui naissent après la passe (diagnostic, extracteur, rejeu)", (int(mp9[1]) if mp9 else None, True), (len(arbre_fin), len(rows_ext2) == len(arbre_fin) + sum(1 for p in rows_ext2 if not p.startswith(PASSE + "/"))))
print(f"   (extension 2 : {len(rows_ext2)} chemin(s) dont {sum(1 for p in rows_ext2 if p.startswith(PASSE + '/'))} dans le dossier de la passe et {sum(1 for p in rows_ext2 if not p.startswith(PASSE + '/'))} ailleurs : " + ", ".join(sorted({p.split('/')[3] for p in rows_ext2 if not p.startswith(PASSE + '/')})) + ")")
tous_d329 = [f for f in git("ls-tree", "-r", "--name-only", FIN, "--", PD).decode().split("\n") if f.strip()]
ctl("Q10", "le journal brut de l'e2e et celui de `test:int` ne sont PAS dans le dépôt (aucun `e2e.log`, aucun `testint.log` sous `docs/preuves/D329/`)", [], [f for f in tous_d329 if re.search(r"/(e2e|testint)\.log$", f)])
print(f"   (parcouru : {len(tous_d329)} fichier(s) sous `{PD}/` ; les extraits `e2e-EXTRAIT.txt` et `testint-EXTRAIT.txt` y sont : {sum(1 for f in tous_d329 if f.endswith('e2e-EXTRAIT.txt') or f.endswith('testint-EXTRAIT.txt'))} sur 2)")
tri_b = show(FIN, f"{PD}/tri-audit-d329b.txt")
ma16 = re.search(r"(\d+) alertes absentes de « a »", txt_prop) or re.search(r"(\d+) alertes absentes de la précédente", txt_prop)
mtri = re.search(r"alertes ABSENTES de la précédente : (\d+)", tri_b)
ctl("Q11", "le dernier audit scellé de D329 : « 16 alertes absentes de la précédente, toutes triées au contexte » (texte) = la ligne du tri différentiel ; le tri versé en cite autant (une ligne `[…] chemin — contexte`)", (int(ma16[1]) if ma16 else None, True), (int(mtri[1]) if mtri else None, len(re.findall(r"^   \[[^\]]+\] .* — contexte : ligne \d+ de ", tri_b, re.M)) == (int(mtri[1]) if mtri else -1)))

# ══ FAMILLE S — fuites ═══════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== S — fuites : un hôte de tunnel, un jeton, dans les pièces et les `.md` de D329")
tunnels = re.compile(r"[A-Za-z0-9-]+\.(?:[A-Za-z0-9-]+\.)*(?:devtunnels\.ms|ngrok(?:-free)?\.(?:app|io|dev)|trycloudflare\.com|loca\.lt|serveo\.net|localtunnel\.me|tunnelmole\.net)")
fichiers_d329 = [f for f in git("ls-tree", "-r", "--name-only", FIN, "--", PD).decode().split("\n") if f.strip()] + list(AUTORITES)
hotes_tunnel, hits_tok, hosts = set(), [], {}
for f in fichiers_d329:
    t = git("show", f"{FIN}:{f}").decode("utf-8", errors="replace")
    hotes_tunnel |= {m.group(0) for m in tunnels.finditer(t)}
    if re.search(r"token=[A-Za-z0-9_-]{43}", t):
        hits_tok.append(f)
    for h in re.findall(r"https?://([A-Za-z0-9.\-]+)", t):
        hosts[h] = hosts.get(h, 0) + 1
src_ext = show(FIN, f"{PD}/outils/extraire-testint.py")
sentinelle = set(re.findall(r"https://([\w\-.]+)/fr/auth/verification-email", src_ext))
ctl("S1", "les seuls hôtes de tunnel présents dans les pièces de D329 et les trois `.md` sont la SENTINELLE de calibration de `extraire-testint.py` (`https://…/fr/auth/verification-email` construit dans le script) — aucun hôte réel", sorted(sentinelle), sorted(hotes_tunnel))
ctl("S2", "aucun jeton de vérification (`token=` suivi de 43 caractères) dans les pièces de D329 ni dans les trois `.md`", [], hits_tok)
print(f"   (parcouru : {len(fichiers_d329)} fichier(s) ; hôtes d'URL distincts rencontrés : {sorted(hosts)})")


# ══ CE QUE LA LECTURE NE PEUT PAS DIRE, ET CE QU'ELLE N'A PAS LU ══════════════════════════════════════════════════════════════
print("\n== CE QUE LA LECTURE NE PEUT PAS DIRE")
non_verifiable("N5", "que les textes de Ko du 12/10 (18 h 39, 23 h 57) et la proposition du relecteur soient reproduits mot pour mot dans les fichiers de ce lot : ils n'existent que dans le chat ; la lecture ne peut vérifier que ce que D329 a déjà écrit")
non_verifiable("N6", "que le dernier audit de secrets de D329 (`d329b`) ait couvert les octets FINAUX des trois `.md` : D329 le déclare lui-même (même limite que A-N1 de D327, C-N1 de D328) ; sa sortie est scellée, pas l'état final des fichiers")
non_verifiable("N7", "que la durée des harnais repris de D324 (26 planchers) soit encore celle d'un démarrage sur ce poste : D329 l'écrit comme limite (« la vérification porte sur `neutralisation/`, pas sur la durée de `pnpm` ou de `vitest` »)")
print("   (la base de développement n'est PAS lue : aucune affirmation de D329 n'en dépend ; aucune porte, aucune campagne n'est rejouée)")
constat("V-C1", "la RAM est tombée sous la barre en cours de fenêtre à D329 (310 échantillons sur 326, dont 12 à `node` = 0 ; la clôture à 4 368,5 Mo) et le point 7 du critère du rang 9 ne disqualifie que `chrome` > 0 : D329 l'a PORTÉ au backlog sans le juger. "
                "Une seconde passe qui réussirait devrait dire, AVANT la mesure, comment ce point se lit ; ce n'est pas un défaut de D329, c'est une question laissée ouverte et qui se posera de nouveau.")
constat("V-C2", "D329 décrit le trou de l'arbre immobile (un fichier ignoré par git qui est une ENTRÉE de `test:int`) comme sa faute n° 1. L'état LIVE (famille E) montre que Ko a remis les trois `.env` à des hôtes locaux ; "
                "aucune pièce de D329 ne relevait l'empreinte ni les hôtes des `.env` avant ou après la passe : la décision 2 du relecteur (relever empreinte et hôtes à l'ouverture et à la clôture) comble ce trou pour la seconde passe.")

# ══ BILAN ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== BILAN")
n_ctl = len(controles)
n_ok = n_ctl - len(ecarts) - len(ecarts_live)
print(f"{n_ctl} contrôles ({n_ok} ✓) · {len(ecarts)} écart(s) de D329 : {ecarts} · {len(ecarts_live)} variation(s) de l'état vivant : {ecarts_live} · {len(constats)} constat(s) : {constats} · {len(non_verifiables)} non vérifiable(s) : {non_verifiables}")
print("ventilation : " + " · ".join(f"{k} {v}" for k, v in sorted(familles.items())) + f" (somme {sum(familles.values())}) — aucune famille à zéro : {all(familles.get(k, 0) > 0 for k in 'XEPCTRDOQS')}")
print(f"calibration : {len(cal)} bras, 0 manqué")
